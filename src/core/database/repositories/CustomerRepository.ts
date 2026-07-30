import { db } from '../db';
import { randomUUID } from 'expo-crypto';

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export class CustomerRepository {
  static getAll(): Customer[] {
    return db.getAllSync('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC') as Customer[];
  }

  static getById(id: string): Customer | null {
    return db.getFirstSync('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [id]) as Customer | null;
  }

  static create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>): Customer {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    db.runSync(
      `INSERT INTO customers (id, store_id, name, phone, address, notes, status, created_at, updated_at, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customer.store_id, customer.name, customer.phone, customer.address, customer.notes, customer.status, now, now, 1]
    );

    // Add to sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'customers', id, 'INSERT', now]
    );

    return this.getById(id)!;
  }

  static update(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>>): Customer | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const updatedCustomer = { ...existing, ...updates };

    db.runSync(
      `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, status = ?, updated_at = ?, version = ? WHERE id = ?`,
      [updatedCustomer.name, updatedCustomer.phone, updatedCustomer.address, updatedCustomer.notes, updatedCustomer.status, now, newVersion, id]
    );

    // Add to sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'customers', id, 'UPDATE', now]
    );

    return this.getById(id);
  }

  static softDelete(id: string): void {
    const now = new Date().toISOString();
    db.runSync(`UPDATE customers SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`, [now, now, id]);

    // Add to sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'customers', id, 'DELETE', now]
    );
  }
}
