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
    const cleanPhone = user.phone.trim();
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
    const cleanPhone = phone.trim();
    const hash = await this.hashPassword(password_plaintext);
    const localUser = this.getByPhone(cleanPhone);

    // الحالة 1: الحساب موجود في قاعدة البيانات المحلية وكلمة المرور صحيحة محلياً
    if (localUser && localUser.password_hash === hash) {
      try {
        const fakeEmail = `${cleanPhone.replace(/\D/g, '')}@rafidain.local`;
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: password_plaintext,
        });

        if (!authError && authData.user) {
          console.log('[UserRepository] Cloud session established for local user ✓');
          useAppStore.getState().setCloudMode(true);
          // سحب تحديثات البيانات من السحابة في الخلفية
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
    }

    // الحالة 2: الحساب غير موجود محلياً (مثلاً جهاز جديد) أو تم تغيير كلمة المرور عبر السحابة
    try {
      const fakeEmail = `${cleanPhone.replace(/\D/g, '')}@rafidain.local`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password_plaintext,
      });

      if (authError || !authData.user) {
        console.warn('[UserRepository] Cloud authentication failed:', authError?.message);
        return null;
      }

      const authUserId = authData.user.id;
      console.log('[UserRepository] Cloud auth successful for ID:', authUserId);

      // جلب صف المستخدم من جدول users في السحابة
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

      // حفظ الحساب في SQLite المحلي للجهاز الجديد
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

      console.log('[UserRepository] User stored in local SQLite from cloud ✓', userToSave.id);

      // تفعيل النمط السحابي
      useAppStore.getState().setCloudMode(true);

      // جلب كافة بيانات التاجر من السحابة إلى قاعدة البيانات المحلية (العملاء، الديون، المدفوعات...)
      try {
        await syncFromCloud(userToSave.id);
        await checkLiveSubscription(userToSave.id);
        console.log('[UserRepository] Full cloud dataset synced to local device ✓');
      } catch (syncErr) {
        console.warn('[UserRepository] Sync after cloud login encountered issue:', syncErr);
      }

      return userToSave;
    } catch (err: any) {
      console.warn('[UserRepository] Cloud login exception:', err?.message ?? err);
      return null;
    }
  }
}

