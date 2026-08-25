import { db } from '../db';
import { randomUUID } from 'expo-crypto';
import { triggerBackgroundSync } from '../../supabase/syncService';

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export class CustomerRepository {
  static getAll(storeId?: string): Customer[] {
    if (!storeId) return [];
    return db.getAllSync(
      'SELECT * FROM customers WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [storeId]
    ) as Customer[];
  }

  static getById(id: string): Customer | null {
    return db.getFirstSync('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [id]) as Customer | null;
  }

  static create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>): Customer {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    db.runSync(
      `INSERT INTO customers (id, store_id, name, phone, address, latitude, longitude, notes, status, created_at, updated_at, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customer.store_id, customer.name, customer.phone, customer.address, customer.latitude || null, customer.longitude || null, customer.notes, customer.status, now, now, 1]
    );

    // Add to sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'customers', id, 'INSERT', now]
    );

    triggerBackgroundSync(customer.store_id);

    return this.getById(id)!;
  }

  static update(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>>): Customer | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const updatedCustomer = { ...existing, ...updates };

    db.runSync(
      `UPDATE customers SET name = ?, phone = ?, address = ?, latitude = ?, longitude = ?, notes = ?, status = ?, updated_at = ?, version = ? WHERE id = ?`,
      [updatedCustomer.name, updatedCustomer.phone, updatedCustomer.address, updatedCustomer.latitude || null, updatedCustomer.longitude || null, updatedCustomer.notes, updatedCustomer.status, now, newVersion, id]
    );

    // Add to sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'customers', id, 'UPDATE', now]
    );

    triggerBackgroundSync(existing.store_id);

    return this.getById(id);
  }

  static softDelete(id: string): void {
    const existing = this.getById(id);
    if (!existing) return;

    const now = new Date().toISOString();
    
    // 1. Delete the customer
    db.runSync(`UPDATE customers SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, id]);
    db.runSync(`INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), 'customers', id, 'DELETE', now]);

    // 2. Find and delete related debts
    const debts = db.getAllSync<{ id: string }>(`SELECT id FROM debts WHERE customer_id = ? AND deleted_at IS NULL`, [id]);
    for (const debt of debts) {
      db.runSync(`UPDATE debts SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, debt.id]);
      db.runSync(`INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), 'debts', debt.id, 'DELETE', now]);
      
      // Delete debt items
      const items = db.getAllSync<{ id: string }>(`SELECT id FROM debt_items WHERE debt_id = ? AND deleted_at IS NULL`, [debt.id]);
      for (const item of items) {
        db.runSync(`UPDATE debt_items SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, item.id]);
        db.runSync(`INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), 'debt_items', item.id, 'DELETE', now]);
      }
    }

    // 3. Find and delete related installments
    const installments = db.getAllSync<{ id: string }>(`SELECT id FROM installments WHERE (customer_id = ? OR debt_id IN (SELECT id FROM debts WHERE customer_id = ?)) AND deleted_at IS NULL`, [id, id]);
    for (const inst of installments) {
      db.runSync(`UPDATE installments SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, inst.id]);
      db.runSync(`INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), 'installments', inst.id, 'DELETE', now]);
    }

    // 4. Find and delete related payments
    const payments = db.getAllSync<{ id: string }>(`SELECT id FROM payments WHERE (customer_id = ? OR debt_id IN (SELECT id FROM debts WHERE customer_id = ?)) AND deleted_at IS NULL`, [id, id]);
    for (const payment of payments) {
      db.runSync(`UPDATE payments SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, payment.id]);
      db.runSync(`INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), 'payments', payment.id, 'DELETE', now]);
    }

    if (existing?.store_id) {
      triggerBackgroundSync(existing.store_id);
    }
  }
}
