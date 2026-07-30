import { db } from '../db';
import { randomUUID } from 'expo-crypto';
import * as Crypto from 'expo-crypto';

export interface User {
  id: string;
  name: string;
  phone: string;
  password_hash: string;
  role: 'owner' | 'manager' | 'cashier' | 'employee';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export class UserRepository {
  static getByPhone(phone: string): User | null {
    return db.getFirstSync('SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL', [phone]) as User | null;
  }

  static getById(id: string): User | null {
    return db.getFirstSync('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]) as User | null;
  }

  static async hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  }

  static async create(user: { name: string; phone: string; password_plaintext: string }): Promise<User> {
    const existingUser = this.getByPhone(user.phone);
    if (existingUser) {
      throw new Error('رقم الهاتف مستخدم مسبقاً');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const password_hash = await this.hashPassword(user.password_plaintext);
    
    db.runSync(
      `INSERT INTO users (id, name, phone, password_hash, role, status, created_at, updated_at, version) 
       VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?, ?)`,
      [id, user.name, user.phone, password_hash, now, now, 1]
    );

    // Sync queue
    db.runSync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), 'users', id, 'INSERT', now]
    );

    return this.getById(id)!;
  }

  static async verifyPassword(phone: string, password_plaintext: string): Promise<User | null> {
    const user = this.getByPhone(phone);
    if (!user) return null;

    const hash = await this.hashPassword(password_plaintext);
    if (user.password_hash === hash) {
      return user;
    }
    return null;
  }
}
