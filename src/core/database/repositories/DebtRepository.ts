import { randomUUID } from 'expo-crypto';
import { triggerBackgroundSync } from '../../supabase/syncService';
import { db } from '../db';

export interface Debt {
  id: string;
  customer_id: string;
  store_id: string;
  title: string;
  product_name: string;
  total_amount: number;
  paid_amount: number;
  down_payment: number;
  remaining_amount: number;
  interest_rate: number;
  due_date: string | null;
  status: 'active' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  type: 'debt' | 'installment';
}

export interface DebtWithCustomer extends Debt {
  customerName: string;
  customerPhone: string | null;
}

export interface PaymentRecord {
  id: string;
  debt_id: string;
  installment_id: string | null;
  customer_id: string;
  store_id: string;
  amount: number;
  payment_date: string;
  type: string;
  payment_method: string;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtItem {
  id: string;
  debt_id: string;
  store_id: string;
  description: string;
  amount: number;
  item_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export class DebtRepository {
  static getAll(storeId?: string): DebtWithCustomer[] {
    if (!storeId) return [];
    return db.getAllSync(
      `SELECT d.*, c.name as customerName, c.phone as customerPhone
       FROM debts d
       LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.store_id = ? AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [storeId]
    ) as DebtWithCustomer[];
  }

  static getAllByCustomerId(customerId: string, storeId?: string): DebtWithCustomer[] {
    if (storeId) {
      return db.getAllSync(
        `SELECT d.*, c.name as customerName, c.phone as customerPhone
         FROM debts d
         LEFT JOIN customers c ON d.customer_id = c.id
         WHERE d.customer_id = ? AND d.store_id = ? AND d.deleted_at IS NULL
         ORDER BY d.created_at DESC`,
        [customerId, storeId]
      ) as DebtWithCustomer[];
    }
    return db.getAllSync(
      `SELECT d.*, c.name as customerName, c.phone as customerPhone
       FROM debts d
       LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.customer_id = ? AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [customerId]
    ) as DebtWithCustomer[];
  }

  static getById(id: string, storeId?: string): DebtWithCustomer | null {
    if (storeId) {
      return db.getFirstSync(
        `SELECT d.*, c.name as customerName, c.phone as customerPhone
         FROM debts d
         LEFT JOIN customers c ON d.customer_id = c.id
         WHERE d.id = ? AND d.store_id = ? AND d.deleted_at IS NULL`,
        [id, storeId]
      ) as DebtWithCustomer | null;
    }
    return db.getFirstSync(
      `SELECT d.*, c.name as customerName, c.phone as customerPhone
       FROM debts d
       LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.id = ? AND d.deleted_at IS NULL`,
      [id]
    ) as DebtWithCustomer | null;
  }

  static getPaymentsForDebt(debtId: string): PaymentRecord[] {
    return db.getAllSync(
      `SELECT * FROM payments WHERE debt_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [debtId]
    ) as PaymentRecord[];
  }

  static getDebtItems(debtId: string): DebtItem[] {
    return db.getAllSync(
      `SELECT * FROM debt_items WHERE debt_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [debtId]
    ) as DebtItem[];
  }

  static create(debt: {
    customer_id: string;
    store_id: string;
    title: string;
    total_amount: number;
    down_payment?: number;
    paid_amount?: number;
    due_date?: string | null;
    status?: 'active' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
    type?: 'debt' | 'installment';
  }): DebtWithCustomer {
    const id = randomUUID();
    const now = new Date().toISOString();
    const downPayment = debt.down_payment || 0;
    const paidAmount = (debt.paid_amount || 0) + downPayment;
    const remainingAmount = Math.max(0, debt.total_amount - paidAmount);
    const initialStatus = remainingAmount === 0 ? 'paid' : (debt.status || 'active');

    db.runSync(
      `INSERT INTO debts (id, customer_id, store_id, title, product_name, total_amount, paid_amount, down_payment, remaining_amount, interest_rate, due_date, status, type, created_at, updated_at, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        debt.customer_id,
        debt.store_id,
        debt.title,
        debt.title,
        debt.total_amount,
        paidAmount,
        downPayment,
        remainingAmount,
        debt.due_date || null,
        initialStatus,
        debt.type || 'debt',
        now,
        now,
      ]
    );

    // Sync queue entry for debt
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debts', id, 'INSERT', now]
    );

    // Initial debt item
    const itemId = randomUUID();
    db.runSync(
      `INSERT INTO debt_items (id, debt_id, store_id, description, amount, item_date, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [itemId, id, debt.store_id, debt.title, debt.total_amount, now.substring(0, 10), now, now]
    );
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debt_items', itemId, 'INSERT', now]
    );

    // If there is a down payment, record it as the first payment transaction
    if (downPayment > 0) {
      const paymentId = randomUUID();
      db.runSync(
        `INSERT INTO payments (id, debt_id, customer_id, store_id, amount, payment_date, type, payment_method, date, notes, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, 'down_payment', 'cash', ?, 'دفعة مقدمة عند إنشاء العقد', ?, ?, 1)`,
        [paymentId, id, debt.customer_id, debt.store_id, downPayment, now.substring(0, 10), now.substring(0, 10), now, now]
      );
      db.runSync(
        `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), 'payments', paymentId, 'INSERT', now]
      );
    }

    triggerBackgroundSync(debt.store_id);

    return this.getById(id, debt.store_id)!;
  }

  static recordPayment(
    debtId: string,
    amount: number,
    storeId?: string,
    paymentMethod: string = 'cash',
    notes?: string
  ): DebtWithCustomer | null {
    const existing = this.getById(debtId, storeId);
    if (!existing) return null;

    const newPaidAmount = (existing.paid_amount || 0) + amount;
    const newRemainingAmount = Math.max(0, existing.total_amount - newPaidAmount);
    const newStatus = newRemainingAmount === 0 ? 'paid' : 'partially_paid';
    const now = new Date().toISOString();

    db.runSync(
      `UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      [newPaidAmount, newRemainingAmount, newStatus, now, debtId]
    );

    // Add payment record
    const paymentId = randomUUID();
    db.runSync(
      `INSERT INTO payments (id, debt_id, customer_id, store_id, amount, payment_date, type, payment_method, date, notes, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, 'payment', ?, ?, ?, ?, ?, 1)`,
      [paymentId, debtId, existing.customer_id, existing.store_id, amount, now.substring(0, 10), paymentMethod, now.substring(0, 10), notes || null, now, now]
    );

    // Add sync queue for debt update and payment insert
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debts', debtId, 'UPDATE', now]
    );
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'payments', paymentId, 'INSERT', now]
    );

    triggerBackgroundSync(storeId || existing.store_id);

    return this.getById(debtId, storeId);
  }

  static addDebtItem(
    debtId: string,
    description: string,
    amount: number,
    storeId: string
  ): DebtWithCustomer | null {
    const existing = this.getById(debtId, storeId);
    if (!existing) return null;

    const newTotalAmount = existing.total_amount + amount;
    const newRemainingAmount = existing.remaining_amount + amount;
    const newStatus = newRemainingAmount === 0 ? 'paid' : (existing.status === 'paid' ? 'active' : existing.status);
    const now = new Date().toISOString();

    db.runSync(
      `UPDATE debts SET total_amount = ?, remaining_amount = ?, status = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      [newTotalAmount, newRemainingAmount, newStatus, now, debtId]
    );

    const itemId = randomUUID();
    db.runSync(
      `INSERT INTO debt_items (id, debt_id, store_id, description, amount, item_date, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [itemId, debtId, storeId, description, amount, now.substring(0, 10), now, now]
    );

    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debts', debtId, 'UPDATE', now]
    );
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debt_items', itemId, 'INSERT', now]
    );

    triggerBackgroundSync(storeId);

    return this.getById(debtId, storeId);
  }

  static softDelete(id: string, storeId?: string): void {
    const now = new Date().toISOString();
    db.runSync(`UPDATE debts SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, id]);

    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debts', id, 'DELETE', now]
    );

    triggerBackgroundSync(storeId);
  }

  static resetAccount(customerId: string, storeId: string): void {
    const now = new Date().toISOString();
    
    // Find all active debts for this customer
    const activeDebts = db.getAllSync(
      `SELECT * FROM debts WHERE customer_id = ? AND store_id = ? AND remaining_amount > 0 AND deleted_at IS NULL`,
      [customerId, storeId]
    ) as Debt[];

    if (activeDebts.length === 0) return;

    for (const debt of activeDebts) {
      const remainingAmount = debt.remaining_amount;
      const newPaidAmount = debt.total_amount;
      
      // Mark debt as paid
      db.runSync(
        `UPDATE debts SET paid_amount = ?, remaining_amount = 0, status = 'paid', updated_at = ?, version = version + 1 WHERE id = ?`,
        [newPaidAmount, now, debt.id]
      );
      
      // Add sync queue for debt
      db.runSync(
        `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), 'debts', debt.id, 'UPDATE', now]
      );

      // Create a reset payment record
      const paymentId = randomUUID();
      db.runSync(
        `INSERT INTO payments (id, debt_id, customer_id, store_id, amount, payment_date, type, payment_method, date, notes, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, 'reset', 'other', ?, 'تم تصفير الحساب بناءً على طلب المستخدم', ?, ?, 1)`,
        [paymentId, debt.id, customerId, storeId, remainingAmount, now.substring(0, 10), now.substring(0, 10), now, now]
      );

      // Add sync queue for payment
      db.runSync(
        `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), 'payments', paymentId, 'INSERT', now]
      );
    }

    triggerBackgroundSync(storeId);
  }
}

