import * as SQLite from 'expo-sqlite';

// Open the local database
export const db = SQLite.openDatabaseSync('rafidain_finance.db');

let isDbInitialized = false;

export const initializeDatabase = () => {
  console.log('[BOOT] initializeDatabase called');
  if (isDbInitialized) {
    console.log('[BOOT] DB already initialized');
    return;
  }
  try {
    // We use updated_at and version for cloud sync conflict resolution
    // We use deleted_at for soft deletes so we can sync deletions
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'owner',
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL UNIQUE,
        plan_tier TEXT DEFAULT 'free',
        status TEXT DEFAULT 'active',
        start_date TEXT NOT NULL,
        end_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        store_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        store_id TEXT,
        title TEXT,
        product_name TEXT,
        total_amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        down_payment REAL DEFAULT 0,
        remaining_amount REAL NOT NULL,
        interest_rate REAL DEFAULT 0,
        due_date TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER DEFAULT 1,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS installments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        customer_id TEXT,
        store_id TEXT,
        installment_number INTEGER DEFAULT 1,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        paid_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER DEFAULT 1,
        FOREIGN KEY(debt_id) REFERENCES debts(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT,
        installment_id TEXT,
        customer_id TEXT,
        store_id TEXT,
        amount REAL NOT NULL,
        payment_date TEXT,
        type TEXT DEFAULT 'payment',
        payment_method TEXT DEFAULT 'cash',
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );
    `);

    const checkAndAddColumn = (table: string, column: string, typeAndDefault: string) => {
      try {
        const tableInfo = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
        const columnExists = tableInfo.some((col) => col.name === column);

        if (!columnExists) {
          console.log(`[BOOT] Migration: Adding column ${column} to table ${table}`);
          db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeAndDefault}`);
        }
      } catch (error) {
        // Don't let one failed column block the rest of the migrations/app boot
        console.error(`[BOOT] MIGRATION FAILED for ${table}.${column}:`, error);
      }
    };

    // Safe and Idempotent Migrations
    const migrations = [
      { table: 'debts', col: 'store_id', def: 'TEXT' },
      { table: 'debts', col: 'title', def: 'TEXT' },
      { table: 'debts', col: 'product_name', def: 'TEXT' },
      { table: 'debts', col: 'paid_amount', def: 'REAL DEFAULT 0' },
      { table: 'debts', col: 'down_payment', def: 'REAL DEFAULT 0' },
      { table: 'debts', col: 'remaining_amount', def: 'REAL DEFAULT 0' },
      { table: 'debts', col: 'interest_rate', def: 'REAL DEFAULT 0' },
      { table: 'debts', col: 'due_date', def: 'TEXT' },
      { table: 'installments', col: 'customer_id', def: 'TEXT' },
      { table: 'installments', col: 'store_id', def: 'TEXT' },
      { table: 'installments', col: 'installment_number', def: 'INTEGER DEFAULT 1' },
      { table: 'payments', col: 'debt_id', def: 'TEXT' },
      { table: 'payments', col: 'installment_id', def: 'TEXT' },
      { table: 'payments', col: 'customer_id', def: 'TEXT' },
      { table: 'payments', col: 'store_id', def: 'TEXT' },
      { table: 'payments', col: 'amount', def: 'REAL DEFAULT 0' },
      { table: 'payments', col: 'payment_date', def: 'TEXT' },
      { table: 'payments', col: 'type', def: 'TEXT DEFAULT "payment"' },
      { table: 'payments', col: 'payment_method', def: 'TEXT DEFAULT "cash"' },
      { table: 'payments', col: 'date', def: 'TEXT DEFAULT "2024-01-01"' },
      { table: 'payments', col: 'notes', def: 'TEXT' },
      { table: 'sync_queue', col: 'synced_at', def: 'TEXT' },
    ];

    for (const m of migrations) {
      checkAndAddColumn(m.table, m.col, m.def);
    }

    // Backfill store_id on legacy local data (pre-dates the store_id/cloud-sync columns)
    // instead of deleting it. This app is single-owner-per-device, so the local
    // "owner" user's id is the correct store_id for any pre-existing rows.
    try {
      const owner = db.getFirstSync<{ id: string }>(
        `SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
      );
      if (owner?.id) {
        db.runSync(
          `UPDATE customers SET store_id = ? WHERE store_id IS NULL OR store_id = '' OR store_id = '00000000-0000-0000-0000-000000000000'`,
          [owner.id]
        );
        db.runSync(
          `UPDATE debts SET store_id = ? WHERE store_id IS NULL OR store_id = '' OR store_id = '00000000-0000-0000-0000-000000000000'`,
          [owner.id]
        );
      }
    } catch (error) {
      console.error('[BOOT] Legacy store_id backfill failed:', error);
    }

    // Legacy on-device installs created the `payments` table with `installment_id`
    // as NOT NULL + FOREIGN KEY REFERENCES installments(id). The new debts/payments
    // flow no longer ties payments to an installment, so recreate the table with the
    // relaxed schema (matching the CREATE TABLE above) if the old constraint is present.
    try {
      const paymentsInfo = db.getAllSync<{ name: string; notnull: number }>(`PRAGMA table_info(payments)`);
      const installmentIdCol = paymentsInfo.find((col) => col.name === 'installment_id');
      if (installmentIdCol && installmentIdCol.notnull) {
        console.log('[BOOT] Migration: Relaxing legacy payments.installment_id constraint');
        db.execSync(`
          ALTER TABLE payments RENAME TO payments_legacy;

          CREATE TABLE payments (
            id TEXT PRIMARY KEY,
            debt_id TEXT,
            installment_id TEXT,
            customer_id TEXT,
            store_id TEXT,
            amount REAL NOT NULL,
            payment_date TEXT,
            type TEXT DEFAULT 'payment',
            payment_method TEXT DEFAULT 'cash',
            date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            version INTEGER DEFAULT 1
          );

          INSERT INTO payments (id, debt_id, installment_id, customer_id, store_id, amount, payment_date, type, payment_method, date, notes, created_at, updated_at, deleted_at, version)
          SELECT id, debt_id, installment_id, customer_id, store_id, amount, payment_date, type, payment_method, date, notes, created_at, updated_at, deleted_at, version
          FROM payments_legacy;

          DROP TABLE payments_legacy;
        `);
      }
    } catch (error) {
      console.error('[BOOT] payments table migration failed:', error);
    }

    isDbInitialized = true;
    console.log('[BOOT] Database initialized and verified successfully');
  } catch (error) {
    // Even on a fatal error, fall through to marking the DB "ready" below so the app
    // doesn't hang forever on the loading screen with zero feedback (queries will just
    // fail individually with a visible error instead of the whole app freezing).
    console.error('[BOOT] FATAL: Failed to initialize database:', error);
  } finally {
    const { useAppStore } = require('../store/appStore');
    useAppStore.getState().setDatabaseReady(true);
  }
};

