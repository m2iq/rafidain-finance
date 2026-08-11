import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { db } from '../database/db';
import { useAppStore } from '../store/appStore';
import { supabase } from './supabaseClient';

export interface SyncProgress {
  stage: 'checking' | 'uploading' | 'downloading' | 'completed' | 'already_synced' | 'error';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

// ============================================
// Smart Queue of any local unsynced records
// ============================================
export async function populateUnsyncedRecordsToQueue(storeId: string): Promise<number> {
  const tables = ['customers', 'debts', 'installments', 'payments'];
  const now = new Date().toISOString();
  let newlyQueued = 0;

  for (const table of tables) {
    try {
      const unsyncedLocalRecords = db.getAllSync<Record<string, any>>(
        `SELECT r.* FROM ${table} r
         LEFT JOIN sync_queue q ON r.id = q.record_id AND q.table_name = ?
         WHERE r.store_id = ? AND q.id IS NULL`,
        [table, storeId]
      );

      if (unsyncedLocalRecords.length === 0) continue;

      const localIds = unsyncedLocalRecords.map((r) => r.id);
      const { data: cloudRecords } = await supabase
        .from(table)
        .select('id, updated_at')
        .in('id', localIds);

      const cloudMap = new Map<string, string>();
      if (cloudRecords) {
        cloudRecords.forEach((c) => cloudMap.set(c.id, c.updated_at));
      }

      for (const record of unsyncedLocalRecords) {
        const cloudUpdatedAt = cloudMap.get(record.id);
        const needsUpload =
          !cloudUpdatedAt ||
          new Date(record.updated_at).getTime() > new Date(cloudUpdatedAt).getTime() + 1000;

        if (needsUpload) {
          db.runSync(
            `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at) VALUES (?, ?, ?, ?, ?)`,
            [randomUUID(), table, record.id, 'INSERT', now]
          );
          newlyQueued++;
        } else {
          db.runSync(
            `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at, synced_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [randomUUID(), table, record.id, 'INSERT', now, now]
          );
        }
      }
    } catch (e) {
      console.warn(`Error populating sync queue for ${table}:`, e);
    }
  }

  return newlyQueued;
}

// ============================================
// Subscription & Account Live Verification
// ============================================
export async function checkLiveSubscription(storeId: string): Promise<boolean> {
  try {
    const [userRes, subRes] = await Promise.all([
      supabase.from('users').select('status').eq('id', storeId).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status, plan_tier, end_date')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (userRes.data?.status === 'inactive') {
      console.warn('[Sync] Account suspended by admin');
      useAppStore.getState().setSubscription(false);
      return false;
    }

    const subData = subRes.data;
    const isSubActive =
      !!subData &&
      subData.status === 'active' &&
      (!subData.end_date || new Date(subData.end_date).getTime() > Date.now());

    useAppStore.getState().setSubscription(isSubActive);
    return isSubActive;
  } catch (error) {
    console.error('checkLiveSubscription error:', error);
    return false;
  }
}

// ============================================
// Main Sync Coordinator with Progress
// ============================================
export async function runSyncWithProgress(
  storeId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  try {
    const state = useAppStore.getState();
    if (!state.isDatabaseReady) {
      throw new Error('قاعدة البيانات قيد التهيئة، يرجى الانتظار...');
    }
    const isSubActive = await checkLiveSubscription(storeId);

    if (!isSubActive || !state.isCloudMode) {
      const errP: SyncProgress = {
        stage: 'error',
        current: 0,
        total: 0,
        percentage: 0,
        message: 'المزامنة متوقفة: يتطلب اشتراكاً سحابياً نشطاً',
      };
      onProgress?.(errP);
      return errP;
    }

    onProgress?.({
      stage: 'checking',
      current: 0,
      total: 0,
      percentage: 10,
      message: 'جاري التحقق من السجلات المحلية...',
    });

    await populateUnsyncedRecordsToQueue(storeId);

    const pendingItems = db.getAllSync<{
      id: string;
      table_name: string;
      record_id: string;
      operation: string;
    }>('SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC');

    if (pendingItems.length === 0) {
      await syncFromCloud(storeId);

      const doneP: SyncProgress = {
        stage: 'already_synced',
        current: 100,
        total: 100,
        percentage: 100,
        message: 'جميع بياناتك مرفوعة ومطابقة بالسحابة بالفعل ✓',
      };
      onProgress?.(doneP);
      return doneP;
    }

    const total = pendingItems.length;
    let current = 0;

    const tableNamesAr: Record<string, string> = {
      customers: 'العملاء',
      debts: 'الديون',
      installments: 'الأقساط',
      payments: 'السندات والمدفوعات',
    };

    for (const item of pendingItems) {
      current++;
      const pct = Math.round((current / total) * 70) + 20;

      onProgress?.({
        stage: 'uploading',
        current,
        total,
        percentage: pct,
        message: `جاري رفع ${tableNamesAr[item.table_name] || item.table_name} (${current}/${total})...`,
      });

      const record = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM ${item.table_name} WHERE id = ?`,
        [item.record_id]
      );

      try {
        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          if (record) {
            let payload: Record<string, any>;
            if (item.table_name === 'users') {
              const { version, store_id, ...userFields } = record;
              payload = userFields;
            } else if (item.table_name === 'debts') {
              if (record.customer_id) {
                const custRec = db.getFirstSync<Record<string, any>>(
                  `SELECT * FROM customers WHERE id = ?`,
                  [record.customer_id]
                );
                if (custRec) {
                  await supabase.from('customers').upsert({
                    ...custRec,
                    store_id: storeId,
                  });
                }
              }

              const { remaining_amount, down_payment, interest_rate, product_name, ...debtFields } = record;
              payload = {
                ...debtFields,
                store_id: storeId,
                due_date: record.due_date ? String(record.due_date).substring(0, 10) : null,
              };
            } else if (item.table_name === 'payments') {
              // Local-only columns that don't exist in the cloud `payments` table
              const { type, date, ...paymentFields } = record;
              payload = {
                ...paymentFields,
                store_id: storeId,
                payment_date: record.payment_date ? String(record.payment_date).substring(0, 10) : String(date).substring(0, 10),
              };
            } else {
              payload = { ...record, store_id: storeId };
            }
            const { error } = await supabase
              .from(item.table_name)
              .upsert(payload);
            if (error) {
              if (error.code === '42501' || error.code === 'PGRST204' || item.table_name === 'users') {
                console.warn(`[Sync] Skipped ${item.table_name}:${item.record_id} due to constraint/schema (${error.code})`, error.message);
                db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
                continue;
              }
              throw error;
            }
          }
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase
            .from(item.table_name)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', item.record_id);
          if (error) {
            if (error.code === '42501' || error.code === 'PGRST204' || item.table_name === 'users') {
              console.warn(`[Sync] Skipped delete ${item.table_name}:${item.record_id} due to constraint`, error.message);
              db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
              continue;
            }
            throw error;
          }
        }

        db.runSync(
          'UPDATE sync_queue SET synced_at = ? WHERE id = ?',
          [new Date().toISOString(), item.id]
        );
      } catch (itemErr: any) {
        // Leave synced_at untouched (NULL) so this item is retried on the next sync pass,
        // unless it's one of the known-permanent, non-retryable errors handled above.
        console.warn(`[Sync] Failed to sync ${item.table_name}:${item.record_id}, will retry next sync`, itemErr?.message || itemErr);
      }
    }

    onProgress?.({
      stage: 'downloading',
      current: total,
      total,
      percentage: 95,
      message: 'جاري تحديث البيانات السحابية الحالية...',
    });

    await syncFromCloud(storeId);

    const finishP: SyncProgress = {
      stage: 'completed',
      current: total,
      total,
      percentage: 100,
      message: `تم رفع المزامنة بنجاح (إجمالي ${total} سجل جديد) ✓`,
    };
    onProgress?.(finishP);
    return finishP;
  } catch (error: any) {
    console.error('Sync failed:', error);
    const errP: SyncProgress = {
      stage: 'error',
      current: 0,
      total: 0,
      percentage: 0,
      message: 'تعثرت المزامنة: ' + (error.message || 'خطأ في الاتصال بالسيرفر'),
    };
    onProgress?.(errP);
    return errP;
  }
}

let syncTimer: any = null;

export function triggerBackgroundSync(storeId?: string) {
  try {
    const state = useAppStore.getState();
    const targetId = storeId || state.user?.id;
    if (!targetId || !state.isCloudMode || !state.isDatabaseReady) return;

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      runSync(targetId).catch((err) => console.warn('[BackgroundSync] Failed:', err));
    }, 400);
  } catch (err) {
    console.warn('[BackgroundSync] Error:', err);
  }
}

export async function runSync(storeId: string) {
  return runSyncWithProgress(storeId);
}

export async function syncToCloud(storeId: string): Promise<void> {
  // Provided for backward compatibility
  await runSyncWithProgress(storeId);
}

// ============================================
// Sync: Pull Cloud data → Local SQLite
// ============================================
export async function syncFromCloud(storeId: string): Promise<void> {
  const tables = ['subscriptions', 'customers', 'debts', 'installments', 'payments'];

  for (const table of tables) {
    try {
      // 1. معرفة أسماء الأعمدة الموجودة في الجدول المحلي فعلياً
      const tableInfo = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
      const validLocalCols = new Set(tableInfo.map((col) => col.name));

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) continue;

      for (const row of data) {
        const local = db.getFirstSync<any>(`SELECT updated_at FROM ${table} WHERE id = ?`, [row.id]);

        if (!local || !local.updated_at || new Date(row.updated_at) > new Date(local.updated_at)) {
          const fullRow: Record<string, any> = { ...row };

          // معالجة الحقل غير الموجود بالسحابة لجدول المدفوعات local `payments.date`
          if (table === 'payments' && fullRow.date === undefined) {
            fullRow.date = fullRow.payment_date || fullRow.created_at || new Date().toISOString();
          }

          // تصفية الأعمدة المطابقة فقط لقاعدة البيانات المحلية لتجنب "no column named"
          const filteredRow: Record<string, any> = {};
          for (const key of Object.keys(fullRow)) {
            if (validLocalCols.has(key)) {
              filteredRow[key] = fullRow[key];
            }
          }

          const columns = Object.keys(filteredRow).join(', ');
          const placeholders = Object.keys(filteredRow).map(() => '?').join(', ');
          const values = Object.values(filteredRow);

          if (columns.length > 0) {
            db.runSync(
              `REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
              values as SQLite.SQLiteBindValue[]
            );
          }
        }
      }
    } catch (err) {
      console.warn(`Pull sync failed for ${table}`, err);
    }
  }
}

// ============================================
// Auth Helpers
// ============================================
export async function registerOnCloud(phone: string, password: string, name: string) {
  return { data: null, error: new Error('Not implemented here') };
}

export async function loginOnCloud(phone: string, password: string) {
  return { data: null, error: new Error('Not implemented here') };
}

export async function logoutFromCloud() {
  await supabase.auth.signOut();
}
