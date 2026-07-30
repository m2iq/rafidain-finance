import { supabase } from './supabaseClient';
import { db } from '../database/db';
import { UserRepository } from '../database/repositories/UserRepository';

// ============================================
// Sync: Push local offline data → Supabase
// ============================================
export async function syncToCloud(storeId: string): Promise<void> {
  const pendingItems = db.getAllSync<{
    id: string;
    table_name: string;
    record_id: string;
    operation: string;
  }>(
    'SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT 100'
  );

  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    try {
      const record = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM ${item.table_name} WHERE id = ?`,
        [item.record_id]
      );

      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        if (record) {
          const { error } = await supabase
            .from(item.table_name)
            .upsert({ ...record, store_id: storeId });
          if (error) throw error;
        }
      } else if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.table_name)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', item.record_id);
        if (error) throw error;
      }

      // Mark as synced
      db.runSync(
        'UPDATE sync_queue SET synced_at = ? WHERE id = ?',
        [new Date().toISOString(), item.id]
      );
    } catch (err) {
      console.warn(`Sync failed for ${item.table_name}:${item.record_id}`, err);
    }
  }
}

// ============================================
// Auth: Register on Supabase with email trick
// phone becomes the "email" via phone@domain.com format
// ============================================
export async function registerOnCloud(phone: string, password: string, name: string) {
  const fakeEmail = `${phone.replace(/\D/g, '')}@rafidain.local`;

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: { data: { name, phone } },
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function loginOnCloud(phone: string, password: string) {
  const fakeEmail = `${phone.replace(/\D/g, '')}@rafidain.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function logoutFromCloud() {
  await supabase.auth.signOut();
}
