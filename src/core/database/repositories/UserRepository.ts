import * as Crypto from 'expo-crypto';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../supabase/supabaseClient';
import { db } from '../db';

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
    return db.getFirstSync(
      'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL',
      [phone]
    ) as User | null;
  }

  static getById(id: string): User | null {
    return db.getFirstSync(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    ) as User | null;
  }

  static async hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  }

  /**
   * إنشاء حساب جديد.
   * - يُحفظ دائماً في SQLite المحلي (offline-first).
   * - يُحاول رفع الحساب إلى Supabase إذا كان هناك إنترنت.
   * - إذا لم يكن هناك إنترنت، يعمل التطبيق بشكل طبيعي بدونه.
   */
  static async create(user: {
    name: string;
    phone: string;
    password_plaintext: string;
  }): Promise<User> {
    // منع التكرار محلياً
    if (this.getByPhone(user.phone)) {
      throw new Error('رقم الهاتف مستخدم مسبقاً');
    }

    const now = new Date().toISOString();
    const password_hash = await this.hashPassword(user.password_plaintext);

    // الخطوة 1: التسجيل في Supabase Auth للحصول على UUID الرسمي
    let finalId = randomUUID();

    try {
      const fakeEmail = `${user.phone.replace(/\D/g, '')}@rafidain.local`;

      // محاولة signUp - إذا كان المستخدم موجوداً أصلاً (rate limit) نحاول signIn
      let authUserId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: user.password_plaintext,
        options: { data: { name: user.name, phone: user.phone } },
      });

      if (signUpError) {
        console.warn('[UserRepository] signUp error:', signUpError.message);
        // عند rate limit أو مشكلة أخرى، نجرب signIn كحل بديل
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: user.password_plaintext,
        });
        if (signInData.user?.id) {
          authUserId = signInData.user.id;
          console.log('[UserRepository] Got existing Auth UID via signIn:', authUserId);
        }
      } else if (signUpData.user?.id) {
        authUserId = signUpData.user.id;
        console.log('[UserRepository] Got new Auth UID via signUp:', authUserId);
      }

      if (authUserId) {
        finalId = authUserId;

        // رفع بيانات المستخدم لجدول users
        const { error: upsertError } = await supabase.from('users').upsert(
          {
            id: finalId,
            name: user.name,
            phone: user.phone,
            password_hash,
            role: 'owner',
            status: 'active',
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );

        if (upsertError) {
          console.warn('[UserRepository] users upsert error:', upsertError.message);
        } else {
          console.log('[UserRepository] User synced to Supabase ✓');

          // إنشاء اشتراك مجاني افتراضي
          await supabase.from('subscriptions').upsert(
            {
              store_id: finalId,
              plan_tier: 'free',
              status: 'active',
              start_date: now,
              created_at: now,
              updated_at: now,
            },
            { onConflict: 'store_id' }
          );
          console.log('[UserRepository] Subscription synced to Supabase ✓');
        }
      }
    } catch (cloudErr: any) {
      console.warn('[UserRepository] Cloud sync skipped (offline?):', cloudErr?.message ?? cloudErr);
    }

    // الخطوة 4: حفظ المستخدم في SQLite المحلي (يحدث دائماً)
    db.runSync(
      `INSERT OR REPLACE INTO users 
         (id, name, phone, password_hash, role, status, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?, 1)`,
      [finalId, user.name, user.phone, password_hash, now, now]
    );

    // الخطوة 5: إضافة للـ sync_queue للمزامنة لاحقاً عند وجود إنترنت
    db.runSync(
      `INSERT OR IGNORE INTO sync_queue (id, table_name, record_id, operation, created_at)
       VALUES (?, 'users', ?, 'INSERT', ?)`,
      [randomUUID(), finalId, now]
    );

    console.log('[UserRepository] User saved locally ✓', finalId);
    return this.getById(finalId)!;
  }

  /**
   * التحقق من كلمة المرور وتسجيل الدخول.
   * - يتحقق أولاً من SQLite المحلي (يعمل بدون إنترنت).
   * - يحاول تسجيل الدخول السحابي إن أمكن.
   */
  static async verifyPassword(
    phone: string,
    password_plaintext: string
  ): Promise<User | null> {
    const user = this.getByPhone(phone);
    if (!user) return null;

    const hash = await this.hashPassword(password_plaintext);
    if (user.password_hash !== hash) return null;

    // محاولة تسجيل الدخول السحابي لتحديث الـ session (لا يعطل الدخول المحلي)
    try {
      const fakeEmail = `${phone.replace(/\D/g, '')}@rafidain.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password_plaintext,
      });
      if (error) {
        console.warn('[UserRepository] Cloud login skipped:', error.message);
      } else {
        console.log('[UserRepository] Cloud session established ✓');
      }
    } catch (cloudErr: any) {
      console.warn('[UserRepository] Offline login mode:', cloudErr?.message ?? cloudErr);
    }

    return user;
  }
}
