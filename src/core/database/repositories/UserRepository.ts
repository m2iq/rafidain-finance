import * as Crypto from 'expo-crypto';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../supabase/supabaseClient';
import { db } from '../db';
import { useAppStore } from '../../store/appStore';
import { syncFromCloud, checkLiveSubscription } from '../../supabase/syncService';

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

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/\s+/g, '')
    .trim();
}

export class UserRepository {
  static getByPhone(phone: string): User | null {
    const clean = normalizePhone(phone);
    return db.getFirstSync(
      'SELECT * FROM users WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL',
      [clean, phone.trim()]
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
    const cleanPhone = normalizePhone(user.phone);
    // منع التكرار محلياً
    if (this.getByPhone(cleanPhone)) {
      throw new Error('رقم الهاتف مستخدم مسبقاً');
    }

    const now = new Date().toISOString();
    const password_hash = await this.hashPassword(user.password_plaintext);

    // الخطوة 1: التسجيل في Supabase Auth للحصول على UUID الرسمي
    let finalId = randomUUID();

    try {
      const fakeEmail = `${cleanPhone.replace(/\D/g, '')}@rafidain.local`;

      // محاولة signUp - إذا كان المستخدم موجوداً أصلاً نحول العملية لتنبيه
      let authUserId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: user.password_plaintext,
        options: { data: { name: user.name, phone: cleanPhone } },
      });

      if (signUpError) {
        console.warn('[UserRepository] signUp error:', signUpError.message);
        // تجربة signIn في حال عدم اكتمال إنشاء الحساب سابقاً
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: user.password_plaintext,
        });
        if (signInData.user?.id) {
          authUserId = signInData.user.id;
          console.log('[UserRepository] Got existing Auth UID via signIn:', authUserId);
        } else if (
          signUpError.message.includes('already registered') ||
          signUpError.message.includes('already exists') ||
          signUpError.message.includes('User already registered')
        ) {
          throw new Error('رقم الهاتف مسجل مسبقاً، يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد');
        }
      } else if (signUpData.user?.id) {
        authUserId = signUpData.user.id;
        console.log('[UserRepository] Got new Auth UID via signUp:', authUserId);
      }

      if (authUserId) {
        finalId = authUserId;
        useAppStore.getState().setCloudMode(true);

        // رفع بيانات المستخدم لجدول users
        const { error: upsertError } = await supabase.from('users').upsert(
          {
            id: finalId,
            name: user.name,
            phone: cleanPhone,
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
      if (cloudErr.message?.includes('رقم الهاتف مسجل مسبقاً')) {
        throw cloudErr;
      }
      console.warn('[UserRepository] Cloud sync skipped (offline?):', cloudErr?.message ?? cloudErr);
    }

    // الخطوة 4: حفظ المستخدم في SQLite المحلي (يحدث دائماً)
    db.runSync(
      `INSERT OR REPLACE INTO users 
         (id, name, phone, password_hash, role, status, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?, 1)`,
      [finalId, user.name, cleanPhone, password_hash, now, now]
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
   * - إذا لم يجد الحساب محلياً أو تغيرت الكلمة، يتصل بـ Supabase للتحقق وجلب الحساب والمزامنة للجهاز الجديد.
   */
  static async verifyPassword(
    phone: string,
    password_plaintext: string
  ): Promise<User | null> {
    const cleanPhone = normalizePhone(phone);
    const hash = await this.hashPassword(password_plaintext);
    const localUser = this.getByPhone(cleanPhone);

    // 1. التحقق محلياً من SQLite
    if (localUser) {
      if (localUser.password_hash === hash) {
        // كلمة المرور صحيحة محلياً
        try {
          const fakeEmail = `${cleanPhone.replace(/\D/g, '')}@rafidain.local`;
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: password_plaintext,
          });

          if (!authError && authData.user) {
            console.log('[UserRepository] Cloud session established for local user ✓');
            useAppStore.getState().setCloudMode(true);
            syncFromCloud(localUser.id).catch((err) =>
              console.warn('[UserRepository] Cloud sync background error:', err)
            );
            checkLiveSubscription(localUser.id).catch((err) =>
              console.warn('[UserRepository] Subscription check background error:', err)
            );
          }
        } catch (cloudErr: any) {
          console.warn('[UserRepository] Offline mode login:', cloudErr?.message ?? cloudErr);
        }

        return localUser;
      } else {
        console.warn('[UserRepository] Local password mismatch for user:', localUser.phone);
      }
    }

    // 2. المحاولة عبر Supabase Auth
    try {
      const fakeEmail = `${cleanPhone.replace(/\D/g, '')}@rafidain.local`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password_plaintext,
      });

      if (!authError && authData.user) {
        const authUserId = authData.user.id;
        console.log('[UserRepository] Supabase Auth successful for ID:', authUserId);

        let { data: cloudUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .maybeSingle();

        if (!cloudUser) {
          const { data: cloudUserByPhone } = await supabase
            .from('users')
            .select('*')
            .eq('phone', cleanPhone)
            .maybeSingle();
          cloudUser = cloudUserByPhone;
        }

        const now = new Date().toISOString();
        const userToSave: User = {
          id: authUserId,
          name: cloudUser?.name || (authData.user.user_metadata?.name as string) || 'تاجر',
          phone: cloudUser?.phone || cleanPhone,
          password_hash: cloudUser?.password_hash || hash,
          role: cloudUser?.role || 'owner',
          status: cloudUser?.status || 'active',
          created_at: cloudUser?.created_at || now,
          updated_at: cloudUser?.updated_at || now,
          deleted_at: cloudUser?.deleted_at || null,
          version: cloudUser?.version || 1,
        };

        db.runSync(
          `INSERT OR REPLACE INTO users 
             (id, name, phone, password_hash, role, status, created_at, updated_at, deleted_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userToSave.id,
            userToSave.name,
            userToSave.phone,
            userToSave.password_hash,
            userToSave.role,
            userToSave.status,
            userToSave.created_at,
            userToSave.updated_at,
            userToSave.deleted_at,
            userToSave.version,
          ]
        );

        useAppStore.getState().setCloudMode(true);
        try {
          await syncFromCloud(userToSave.id);
          await checkLiveSubscription(userToSave.id);
        } catch (syncErr) {
          console.warn('[UserRepository] Sync error after auth:', syncErr);
        }

        return userToSave;
      }
    } catch (authErr: any) {
      console.warn('[UserRepository] Supabase Auth exception:', authErr?.message ?? authErr);
    }

    // 3. الخطوة الاحتياطية: الاستعلام المباشر من جدول users بالسحابة (في حال كان هناك تعثر في Supabase Auth)
    try {
      const { data: cloudUser, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (cloudUser && !queryError) {
        if (cloudUser.password_hash === hash) {
          console.log('[UserRepository] Direct DB password match for user:', cloudUser.id);
          const userToSave: User = {
            id: cloudUser.id,
            name: cloudUser.name || 'تاجر',
            phone: cloudUser.phone || cleanPhone,
            password_hash: cloudUser.password_hash,
            role: cloudUser.role || 'owner',
            status: cloudUser.status || 'active',
            created_at: cloudUser.created_at || new Date().toISOString(),
            updated_at: cloudUser.updated_at || new Date().toISOString(),
            deleted_at: cloudUser.deleted_at || null,
            version: cloudUser.version || 1,
          };

          db.runSync(
            `INSERT OR REPLACE INTO users 
               (id, name, phone, password_hash, role, status, created_at, updated_at, deleted_at, version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userToSave.id,
              userToSave.name,
              userToSave.phone,
              userToSave.password_hash,
              userToSave.role,
              userToSave.status,
              userToSave.created_at,
              userToSave.updated_at,
              userToSave.deleted_at,
              userToSave.version,
            ]
          );

          useAppStore.getState().setCloudMode(true);
          try {
            await syncFromCloud(userToSave.id);
            await checkLiveSubscription(userToSave.id);
          } catch (syncErr) {
            console.warn('[UserRepository] Sync error after direct DB match:', syncErr);
          }

          return userToSave;
        } else {
          console.warn('[UserRepository] Direct DB password mismatch');
          throw new Error('كلمة المرور غير صحيحة');
        }
      }
    } catch (dbErr: any) {
      if (dbErr.message === 'كلمة المرور غير صحيحة') {
        throw dbErr;
      }
      console.warn('[UserRepository] Direct DB query error:', dbErr?.message ?? dbErr);
    }

    if (localUser) {
      throw new Error('كلمة المرور غير صحيحة');
    }

    throw new Error('رقم الهاتف غير مسجل في النظام');
  }

  static async changePassword(userId: string, currentPlaintext: string, newPlaintext: string): Promise<void> {
    const user = this.getById(userId);
    if (!user) throw new Error('المستخدم غير موجود');

    const currentHash = await this.hashPassword(currentPlaintext);
    if (user.password_hash !== currentHash) {
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }

    if (newPlaintext.length < 6) {
      throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    }

    const newHash = await this.hashPassword(newPlaintext);
    const now = new Date().toISOString();

    // Update locally
    db.runSync(
      `UPDATE users SET password_hash = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      [newHash, now, userId]
    );

    // Add sync queue entry
    db.runSync(
      `INSERT OR IGNORE INTO sync_queue (id, table_name, record_id, operation, created_at)
       VALUES (?, 'users', ?, 'UPDATE', ?)`,
      [randomUUID(), userId, now]
    );

    // Update cloud if online
    try {
      await supabase.auth.updateUser({ password: newPlaintext });
      await supabase.from('users').update({ password_hash: newHash, updated_at: now }).eq('id', userId);
    } catch (err) {
      console.warn('[UserRepository] Cloud password update skipped/failed:', err);
    }
  }

  static async updateProfile(userId: string, updates: { name: string; phone: string }): Promise<void> {
    const name = updates.name.trim();
    const phone = updates.phone.trim();
    if (!name) throw new Error('يرجى إدخال الاسم الكامل');

    const now = new Date().toISOString();

    // Update locally
    db.runSync(
      `UPDATE users SET name = ?, phone = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      [name, phone, now, userId]
    );

    // Add sync queue entry
    db.runSync(
      `INSERT OR IGNORE INTO sync_queue (id, table_name, record_id, operation, created_at)
       VALUES (?, 'users', ?, 'UPDATE', ?)`,
      [randomUUID(), userId, now]
    );

    // Update cloud if online
    try {
      await supabase.from('users').update({ name, phone, updated_at: now }).eq('id', userId);
    } catch (err) {
      console.warn('[UserRepository] Cloud profile update skipped/failed:', err);
    }
  }
}


