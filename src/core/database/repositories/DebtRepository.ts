import { db } from '../db';
import { randomUUID } from 'expo-crypto';

export interface Debt {
  id: string;
  customer_id: string;
  product_name: string;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  interest_rate: number;
  status: 'active' | 'completed' | 'defaulted';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export class DebtRepository {
  static getAllByCustomerId(customer_id: string): Debt[] {
    return db.getAllSync(
      'SELECT * FROM debts WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', 
      [customer_id]
    ) as Debt[];
  }

  static getById(id: string): Debt | null {
    return db.getFirstSync('SELECT * FROM debts WHERE id = ? AND deleted_at IS NULL', [id]) as Debt | null;
  }

  static create(debt: Omit<Debt, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>): Debt {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    db.runSync(
      `INSERT INTO debts (id, customer_id, product_name, total_amount, down_payment, remaining_amount, interest_rate, status, created_at, updated_at, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, debt.customer_id, debt.product_name, debt.total_amount, debt.down_payment, debt.remaining_amount, debt.interest_rate, debt.status, now, now, 1]
    );

    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'debts', id, 'INSERT', now]
    );

    return this.getById(id)!;
  }
}
