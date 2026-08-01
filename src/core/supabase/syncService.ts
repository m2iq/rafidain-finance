import { supabase } from './supabaseClient';
import { db } from '../database/db';
import { useAppStore } from '../store/appStore';
import { UserRepository } from '../database/repositories/UserRepository';

// ============================================
// Main Sync Coordinator
// ============================================
export async function runSync(storeId: string) {
  const { hasActiveSubscription, isCloudMode } = useAppStore.getState();
  
  if (!hasActiveSubscription || !isCloudMode) {
    console.log('Sync skipped: No active subscription or Cloud Mode is off');
    return;
  }

  try {
    await syncToCloud(storeId);
    await syncFromCloud(storeId);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

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
// Sync: Pull Cloud data → Local SQLite
// ============================================
export async function syncFromCloud(storeId: string): Promise<void> {
  const tables = ['customers', 'debts', 'installments', 'payments'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) continue;

      for (const row of data) {
        // Upsert into local SQLite based on 'updated_at' and 'version'
        // For simplicity, we assume server 'version' >= local 'version' wins.
        const local = db.getFirstSync<any>(`SELECT version, updated_at FROM ${table} WHERE id = ?`, [row.id]);
        
        if (!local || new Date(row.updated_at) > new Date(local.updated_at)) {
          // Construct UPSERT query (requires sqlite 3.24+)
          const keys = Object.keys(row).filter(k => k !== 'store_id'); // We don't save store_id locally for standard tables to save space, wait actually we do for customers!
          
          // Just use replace into for simplicity in this demo
          const columns = Object.keys(row).join(', ');
          const placeholders = Object.keys(row).map(() => '?').join(', ');
          const values = Object.values(row);

          db.runSync(`REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`, values);
        }
      }
    } catch (err) {
      console.warn(`Pull sync failed for ${table}`, err);
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
