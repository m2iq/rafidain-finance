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
// Tables in dependency order (FK safe)
// ============================================
const SYNC_TABLES = ['customers', 'debts', 'debt_items', 'installments', 'payments'] as const;
type SyncTable = (typeof SYNC_TABLES)[number];

const TABLE_NAMES_AR: Record<string, string> = {
  customers: 'العملاء',
  debts: 'الديون',
  debt_items: 'عناصر الديون',
  installments: 'الأقساط',
  payments: 'المدفوعات',
};

// ============================================
// Build upload payload per table
// Strip local-only columns / generated columns
// ============================================

/** Round a numeric value to 2 decimal places and cap at NUMERIC(18,2) max */
function sanitizeAmount(val: any): number {
  const n = parseFloat(String(val ?? 0));
  if (!isFinite(n)) return 0;
  return Math.round(Math.min(Math.abs(n), 9_999_999_999_999_999) * 100) / 100;
}

function buildUploadPayload(table: SyncTable, record: Record<string, any>, storeId: string): Record<string, any> {
  const base: Record<string, any> = { ...record, store_id: storeId };

  switch (table) {
    case 'debts': {
      // Strip local-only columns + GENERATED/computed columns
      // remaining_amount: let DB compute via trigger (after migration) or GENERATED AS (before migration)
      const { product_name, interest_rate, down_payment, remaining_amount, ...rest } = base;
      const total = sanitizeAmount(record.total_amount);
      const paid  = sanitizeAmount(record.paid_amount);
      return {
        ...rest,
        total_amount: total,
        paid_amount:  paid,
        due_date: record.due_date ? String(record.due_date).substring(0, 10) : null,
      };
    }

    case 'debt_items': {
      return {
        ...base,
        amount: sanitizeAmount(record.amount),
        item_date: record.item_date
          ? String(record.item_date).substring(0, 10)
          : new Date().toISOString().substring(0, 10),
      };
    }

    case 'installments': {
      return {
        ...base,
        amount: sanitizeAmount(record.amount),
        due_date: record.due_date ? String(record.due_date).substring(0, 10) : null,
        paid_date: record.paid_date ? String(record.paid_date).substring(0, 10) : null,
      };
    }

    case 'payments': {
      // Strip local-only columns: `type`, `date`
      const { type, date, ...paymentRest } = base;
      return {
        ...paymentRest,
        amount: sanitizeAmount(record.amount),
        payment_date: record.payment_date
          ? String(record.payment_date).substring(0, 10)
          : record.date
          ? String(record.date).substring(0, 10)
          : new Date().toISOString().substring(0, 10),
      };
    }

    case 'customers':
    default:
      return base;
  }
}


// ============================================
// Pull one page of data from cloud (paginated)
// ============================================
async function pullTablePage(
  table: string,
  storeId: string,
  page: number,
  pageSize: number
): Promise<any[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data || [];
}

// ============================================
// Sync: Pull Cloud data → Local SQLite (paginated, handles deletes)
// ============================================
export async function syncFromCloud(storeId: string): Promise<void> {
  const PAGE_SIZE = 200;

  for (const table of [...SYNC_TABLES, 'subscriptions'] as string[]) {
    try {
      // Get local column names to avoid "no column named X" errors
      const tableInfo = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
      const validLocalCols = new Set(tableInfo.map((col) => col.name));

      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const rows = await pullTablePage(table, storeId, page, PAGE_SIZE);
        hasMore = rows.length === PAGE_SIZE;
        page++;

        for (const row of rows) {
          // Fix payments: cloud has payment_date, local needs date too
          const fullRow: Record<string, any> = { ...row };
          if (table === 'payments') {
            if (!fullRow.date) {
              fullRow.date = fullRow.payment_date || fullRow.created_at || new Date().toISOString();
            }
            if (!fullRow.payment_date) {
              fullRow.payment_date = fullRow.date;
            }
          }

          // Check if local record exists and which is newer
          const local = db.getFirstSync<{ updated_at: string }>(
            `SELECT updated_at FROM ${table} WHERE id = ?`,
            [row.id]
          );

          const cloudIsNewer =
            !local ||
            !local.updated_at ||
            new Date(row.updated_at) > new Date(local.updated_at);

          if (cloudIsNewer) {
            // Filter columns to only those that exist locally
            const filteredRow: Record<string, any> = {};
            for (const key of Object.keys(fullRow)) {
              if (validLocalCols.has(key)) {
                filteredRow[key] = fullRow[key];
              }
            }

            if (Object.keys(filteredRow).length > 0) {
              const columns = Object.keys(filteredRow).join(', ');
              const placeholders = Object.keys(filteredRow).map(() => '?').join(', ');
              const values = Object.values(filteredRow);

              db.runSync(
                `REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
                values as SQLite.SQLiteBindValue[]
              );
            }
          }
        }

        if (!hasMore) break;
      }
    } catch (err) {
      console.warn(`[Sync] Pull failed for table: ${table}`, err);
    }
  }

  // مزامنة إعدادات وقوالب رسائل الواتساب الخاصة بالمستخدم من السحابة
  try {
    const { data: userCloud } = await supabase
      .from('users')
      .select('whatsapp_order_message, whatsapp_payment_message')
      .eq('id', storeId)
      .maybeSingle();

    if (userCloud && (userCloud.whatsapp_order_message || userCloud.whatsapp_payment_message)) {
      const orderMsg = userCloud.whatsapp_order_message || '';
      const payMsg = userCloud.whatsapp_payment_message || '';
      useAppStore.getState().setWhatsappMessages(orderMsg, payMsg);
      db.runSync(
        `UPDATE users SET whatsapp_order_message = ?, whatsapp_payment_message = ? WHERE id = ?`,
        [orderMsg, payMsg, storeId]
      );
    } else {
      const { data: authUserData } = await supabase.auth.getUser();
      const meta = authUserData?.user?.user_metadata;
      if (meta?.whatsapp_order_message || meta?.whatsapp_payment_message) {
        const orderMsg = meta.whatsapp_order_message || '';
        const payMsg = meta.whatsapp_payment_message || '';
        useAppStore.getState().setWhatsappMessages(orderMsg, payMsg);
        db.runSync(
          `UPDATE users SET whatsapp_order_message = ?, whatsapp_payment_message = ? WHERE id = ?`,
          [orderMsg, payMsg, storeId]
        );
      }
    }
  } catch (userSyncErr) {
    console.warn('[Sync] User settings sync warning:', userSyncErr);
  }
}

// ============================================
// Ensure parent records exist in cloud before child
// ============================================
async function ensureParentInCloud(table: SyncTable, record: Record<string, any>, storeId: string): Promise<void> {
  try {
    if (table === 'debts' && record.customer_id) {
      const custRec = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM customers WHERE id = ?`,
        [record.customer_id]
      );
      if (custRec) {
        await supabase.from('customers').upsert({ ...custRec, store_id: storeId });
      }
    } else if ((table === 'debt_items' || table === 'installments' || table === 'payments') && record.debt_id) {
      // Ensure the parent debt and its customer exist
      const debtRec = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM debts WHERE id = ?`,
        [record.debt_id]
      );
      if (debtRec) {
        // Ensure customer first
        if (debtRec.customer_id) {
          const custRec = db.getFirstSync<Record<string, any>>(
            `SELECT * FROM customers WHERE id = ?`,
            [debtRec.customer_id]
          );
          if (custRec) {
            await supabase.from('customers').upsert({ ...custRec, store_id: storeId });
          }
        }
        // Then ensure debt
        const debtPayload = buildUploadPayload('debts', debtRec, storeId);
        await supabase.from('debts').upsert(debtPayload);
      }
    }
  } catch (e) {
    console.warn(`[Sync] ensureParentInCloud failed for ${table}:`, e);
  }
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
      subData.plan_tier !== 'free' &&
      (!subData.end_date || new Date(subData.end_date).getTime() > Date.now());

    useAppStore.getState().setSubscription(isSubActive);
    return isSubActive;
  } catch (error) {
    console.error('[Sync] checkLiveSubscription error:', error);
    return false;
  }
}

// ============================================
// Populate unsynced records into sync_queue
// Only queues records not already pending
// ============================================
export async function populateUnsyncedRecordsToQueue(storeId: string): Promise<number> {
  const now = new Date().toISOString();
  let newlyQueued = 0;

  for (const table of SYNC_TABLES) {
    try {
      // Find records with no pending sync_queue entry
      const unsyncedLocalRecords = db.getAllSync<Record<string, any>>(
        `SELECT r.* FROM ${table} r
         WHERE r.store_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM sync_queue q
           WHERE q.record_id = r.id
           AND q.table_name = ?
           AND q.synced_at IS NULL
         )`,
        [storeId, table]
      );

      if (unsyncedLocalRecords.length === 0) continue;

      // Check which of these are already up-to-date in cloud
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

        db.runSync(
          `INSERT INTO sync_queue (id, table_name, record_id, operation, created_at${needsUpload ? '' : ', synced_at'}) VALUES (?, ?, ?, ?, ?${needsUpload ? '' : ', ?'})`,
          needsUpload
            ? [randomUUID(), table, record.id, 'INSERT', now]
            : [randomUUID(), table, record.id, 'INSERT', now, now]
        );

        if (needsUpload) newlyQueued++;
      }
    } catch (e) {
      console.warn(`[Sync] Error populating sync queue for ${table}:`, e);
    }
  }

  return newlyQueued;
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

    onProgress?.({ stage: 'checking', current: 0, total: 0, percentage: 10, message: 'جاري التحقق من السجلات المحلية...' });

    await populateUnsyncedRecordsToQueue(storeId);

    const pendingItems = db.getAllSync<{
      id: string;
      table_name: string;
      record_id: string;
      operation: string;
    }>('SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC');

    if (pendingItems.length === 0) {
      onProgress?.({ stage: 'downloading', current: 0, total: 0, percentage: 80, message: 'جاري سحب آخر التحديثات من السحابة...' });
      await syncFromCloud(storeId);

      const doneP: SyncProgress = {
        stage: 'already_synced',
        current: 100,
        total: 100,
        percentage: 100,
        message: 'جميع بياناتك مرفوعة ومطابقة بالسحابة ✓',
      };
      onProgress?.(doneP);
      return doneP;
    }

    const total = pendingItems.length;
    let current = 0;

    // Upload pending items in FK-safe order
    for (const item of pendingItems) {
      current++;
      const pct = Math.round((current / total) * 70) + 20;

      onProgress?.({
        stage: 'uploading',
        current,
        total,
        percentage: pct,
        message: `جاري رفع ${TABLE_NAMES_AR[item.table_name] || item.table_name} (${current}/${total})...`,
      });

      const record = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM ${item.table_name} WHERE id = ?`,
        [item.record_id]
      );

      try {
        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          if (record) {
            // Ensure parent records exist in cloud before uploading child
            await ensureParentInCloud(item.table_name as SyncTable, record, storeId);

            const payload = buildUploadPayload(item.table_name as SyncTable, record, storeId);

            const { error } = await supabase.from(item.table_name).upsert(payload);

            if (error) {
              // Known non-retryable errors
              const skipCodes = ['42501', 'PGRST204', '23503'];
              if (skipCodes.some((c) => error.code?.startsWith(c)) || item.table_name === 'users') {
                console.warn(`[Sync] Skipped ${item.table_name}:${item.record_id} (${error.code}): ${error.message}`);
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
            const skipCodes = ['42501', 'PGRST204'];
            if (skipCodes.some((c) => error.code?.startsWith(c)) || item.table_name === 'users') {
              console.warn(`[Sync] Skipped delete ${item.table_name}:${item.record_id} (${error.code})`);
              db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
              continue;
            }
            throw error;
          }
        }

        db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
      } catch (itemErr: any) {
        console.warn(`[Sync] Failed to sync ${item.table_name}:${item.record_id} — will retry next pass`, itemErr?.message || itemErr);
        // Leave synced_at = NULL so it retries on next sync
      }
    }

    onProgress?.({ stage: 'downloading', current: total, total, percentage: 93, message: 'جاري سحب تحديثات الأجهزة الأخرى...' });
    await syncFromCloud(storeId);

    const finishP: SyncProgress = {
      stage: 'completed',
      current: total,
      total,
      percentage: 100,
      message: `تمت المزامنة بنجاح (${total} سجل) ✓`,
    };
    onProgress?.(finishP);
    return finishP;
  } catch (error: any) {
    console.error('[Sync] Sync failed:', error);
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

// ============================================
// Fast-path: push only pending sync_queue items
// Called immediately after every write — no network pre-checks,
// uses the cached subscription state from appStore.
// ============================================
let isFastPushRunning = false;

export async function pushPendingQueue(storeId: string): Promise<void> {
  if (isFastPushRunning) return; // prevent overlapping runs
  const state = useAppStore.getState();
  if (!state.isCloudMode || !state.isDatabaseReady || !state.hasActiveSubscription) return;

  isFastPushRunning = true;
  try {
    const pendingItems = db.getAllSync<{
      id: string;
      table_name: string;
      record_id: string;
      operation: string;
    }>('SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC');

    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      const record = db.getFirstSync<Record<string, any>>(
        `SELECT * FROM ${item.table_name} WHERE id = ?`,
        [item.record_id]
      );

      try {
        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          if (record) {
            await ensureParentInCloud(item.table_name as SyncTable, record, storeId);
            const payload = buildUploadPayload(item.table_name as SyncTable, record, storeId);
            const { error } = await supabase.from(item.table_name).upsert(payload);
            if (error) {
              const skipCodes = ['42501', 'PGRST204', '23503'];
              if (skipCodes.some((c) => error.code?.startsWith(c)) || item.table_name === 'users') {
                db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
                continue;
              }
              // On retryable error, leave synced_at NULL for next pass
              console.warn(`[FastSync] Upload failed for ${item.table_name}:${item.record_id}`, error.message);
              continue;
            }
          }
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase
            .from(item.table_name)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', item.record_id);
          if (error) {
            console.warn(`[FastSync] Delete failed for ${item.table_name}:${item.record_id}`, error.message);
            continue;
          }
        }

        db.runSync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', [new Date().toISOString(), item.id]);
      } catch (err: any) {
        console.warn(`[FastSync] Error on ${item.table_name}:${item.record_id}`, err?.message || err);
      }
    }
  } finally {
    isFastPushRunning = false;
  }
}

// ============================================
// Debounced instant push (100ms) — called after every write
// ============================================
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerBackgroundSync(storeId?: string) {
  try {
    const state = useAppStore.getState();
    const targetId = storeId || state.user?.id;
    if (!targetId || !state.isCloudMode || !state.isDatabaseReady) return;

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      pushPendingQueue(targetId).catch((err) => console.warn('[FastSync] Failed:', err));
    }, 100); // instant — 100ms debounce to batch rapid consecutive writes
  } catch (err) {
    console.warn('[BackgroundSync] Error:', err);
  }
}

// ============================================
// Periodic sync: every 5 minutes when app is active
// Call startPeriodicSync() once on app mount
// ============================================
let periodicSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicSync() {
  if (periodicSyncInterval) return; // already running

  periodicSyncInterval = setInterval(() => {
    const state = useAppStore.getState();
    const storeId = state.user?.id;
    if (!storeId || !state.isCloudMode || !state.isDatabaseReady) return;

    console.log('[PeriodicSync] Running scheduled sync...');
    runSync(storeId).catch((err) => console.warn('[PeriodicSync] Failed:', err));
  }, 5 * 60 * 1000); // every 5 minutes
}

export function stopPeriodicSync() {
  if (periodicSyncInterval) {
    clearInterval(periodicSyncInterval);
    periodicSyncInterval = null;
  }
}

export async function runSync(storeId: string) {
  return runSyncWithProgress(storeId);
}

export async function syncToCloud(storeId: string): Promise<void> {
  await runSyncWithProgress(storeId);
}

// ============================================
// Auth Helpers (stubs)
// ============================================
export async function registerOnCloud(phone: string, password: string, name: string) {
  return { data: null, error: new Error('Not implemented here') };
}

export async function loginOnCloud(phone: string, password: string) {
  return { data: null, error: new Error('Not implemented here') };
}

export async function logoutFromCloud() {
  stopPeriodicSync();
  await supabase.auth.signOut();
}
