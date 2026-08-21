-- =====================================================
-- Rafidain Finance - Sync Fix Migration (v2)
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 0: Drop ALL dependent triggers first
-- (required before altering column types)
-- =====================================================
DROP TRIGGER IF EXISTS trg_debts_remaining ON public.debts;
DROP TRIGGER IF EXISTS trg_debts_updated ON public.debts;
DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
DROP TRIGGER IF EXISTS trg_debt_items_updated ON public.debt_items;
DROP TRIGGER IF EXISTS trg_installments_updated ON public.installments;
DROP TRIGGER IF EXISTS trg_payments_updated ON public.payments;
DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_users_updated ON public.users;

-- =====================================================
-- STEP 1: Widen all amount columns to NUMERIC(18, 2)
-- NUMERIC(12,2) max = ~9.9B — overflows for large IQD amounts
-- NUMERIC(18,2) max = ~9.9 quadrillion — safe for any realistic amount
-- =====================================================
ALTER TABLE public.debts        ALTER COLUMN total_amount  TYPE NUMERIC(18, 2);
ALTER TABLE public.debts        ALTER COLUMN paid_amount   TYPE NUMERIC(18, 2);
ALTER TABLE public.debt_items   ALTER COLUMN amount        TYPE NUMERIC(18, 2);
ALTER TABLE public.installments ALTER COLUMN amount        TYPE NUMERIC(18, 2);
ALTER TABLE public.payments     ALTER COLUMN amount        TYPE NUMERIC(18, 2);

-- =====================================================
-- STEP 2: Fix remaining_amount — convert from GENERATED ALWAYS AS
-- to a regular writable column
-- =====================================================
ALTER TABLE public.debts DROP COLUMN IF EXISTS remaining_amount;
ALTER TABLE public.debts ADD COLUMN remaining_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;
UPDATE public.debts SET remaining_amount = GREATEST(0, total_amount - paid_amount);

-- =====================================================
-- STEP 3: Add latitude/longitude to customers (if missing)
-- =====================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- =====================================================
-- STEP 4: Make payments.debt_id and customer_id nullable
-- =====================================================
ALTER TABLE public.payments ALTER COLUMN debt_id     DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN customer_id DROP NOT NULL;

-- =====================================================
-- STEP 5: Ensure payments has version column
-- =====================================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- =====================================================
-- STEP 6: Add performance indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_updated    ON public.customers(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_debts_updated        ON public.debts(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_debt_items_updated   ON public.debt_items(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_installments_updated ON public.installments(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_updated     ON public.payments(store_id, updated_at DESC);

-- =====================================================
-- STEP 7: Recreate all triggers (after column changes)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_debts_updated
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_debt_items_updated
  BEFORE UPDATE ON public.debt_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_installments_updated
  BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-maintain remaining_amount on debts
CREATE OR REPLACE FUNCTION sync_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount := GREATEST(0, NEW.total_amount - NEW.paid_amount);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_debts_remaining
  BEFORE INSERT OR UPDATE OF total_amount, paid_amount ON public.debts
  FOR EACH ROW EXECUTE FUNCTION sync_remaining_amount();

-- =====================================================
-- Verify
-- =====================================================
SELECT 'Migration v2 completed successfully' AS status;
