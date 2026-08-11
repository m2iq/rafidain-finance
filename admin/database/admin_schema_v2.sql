-- ===================================================
-- Rafidain Finance - Full Admin Schema (v2)
-- Execute this SQL in Supabase SQL Editor
-- ===================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tier_key TEXT NOT NULL UNIQUE, -- e.g. 'cloud_monthly', 'cloud_yearly'
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans if empty
INSERT INTO public.subscription_plans (name, tier_key, price, duration_days, is_active, features)
VALUES 
  ('الباقة الشهرية السحابية', 'cloud_monthly', 5000, 30, true, '["مزامنة سحابية فورية", "نسخ احتياطي تلقائي", "استخدام متعدد الأجهزة"]'::jsonb),
  ('باقة 3 أشهر السحابية', 'cloud_quarterly', 10000, 90, true, '["توفير 33%", "مزامنة سحابية فورية", "دعم فني مخصص"]'::jsonb)
ON CONFLICT (tier_key) DO NOTHING;

-- 3. Subscription History (Complete logs of sub changes)
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'activated', 'extended', 'cancelled', 'expired', 'renewed'
  days_added INTEGER DEFAULT 0,
  by_admin_id UUID REFERENCES public.admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Voucher Codes System
CREATE TABLE IF NOT EXISTS public.voucher_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_usages INTEGER NOT NULL DEFAULT 1,
  current_usages INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Voucher Redemptions
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES public.voucher_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. User Devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- 7. Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.admins(id),
  action TEXT NOT NULL, -- e.g. 'suspend_user', 'extend_subscription', 'create_voucher', 'toggle_cloud'
  target_user_id UUID REFERENCES public.users(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.system_settings (key, value)
VALUES
  ('cloud_service_enabled', 'true'::jsonb),
  ('registration_enabled', 'true'::jsonb),
  ('app_name', '"Rafidain Finance"'::jsonb),
  ('app_version', '"1.0.0"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 9. Push Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'group', 'user')),
  target_user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================
-- Row Level Security (RLS) & Policies
-- ===================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security Definer Function to Check Admin Privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Admin Tables
CREATE POLICY "admin_full_access_admins" ON public.admins FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_plans" ON public.subscription_plans FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_sub_history" ON public.subscription_history FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_voucher_codes" ON public.voucher_codes FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_voucher_redemptions" ON public.voucher_redemptions FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_user_devices" ON public.user_devices FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_audit_logs" ON public.admin_audit_logs FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_system_settings" ON public.system_settings FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access_notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- Allow App Users to read active subscription plans and system settings
CREATE POLICY "public_read_active_plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_system_settings" ON public.system_settings FOR SELECT USING (true);

-- Full admin policies over application core tables
DROP POLICY IF EXISTS "admin_all_access_users" ON public.users;
CREATE POLICY "admin_all_access_users" ON public.users FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_subscriptions" ON public.subscriptions;
CREATE POLICY "admin_all_access_subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_customers" ON public.customers;
CREATE POLICY "admin_all_access_customers" ON public.customers FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_debts" ON public.debts;
CREATE POLICY "admin_all_access_debts" ON public.debts FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_installments" ON public.installments;
CREATE POLICY "admin_all_access_installments" ON public.installments FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_payments" ON public.payments;
CREATE POLICY "admin_all_access_payments" ON public.payments FOR ALL USING (public.is_admin());
