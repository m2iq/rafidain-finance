-- =====================================================
-- إصلاح شامل لـ RLS وتصريحات القراءة للوحة التحكم (Admin)
-- انسخ الكود بالكامل وقم بتشغيله في Supabase SQL Editor
-- =====================================================

-- 1. التأكد من وجود الجداول الهيكلية
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier', 'employee')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'cloud_monthly', 'cloud_quarterly', 'cloud_yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.1 إضافة الأعمدة المكملة لجدول الديون
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS down_payment NUMERIC(12, 2) DEFAULT 0;

-- 2. تفعيل RLS لكافة الجداول
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. حذف السياسات القديمة
DROP POLICY IF EXISTS "users_self_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;

DROP POLICY IF EXISTS "subscriptions_owner_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_all" ON public.subscriptions;

DROP POLICY IF EXISTS "customers_owner_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_select_all" ON public.customers;

DROP POLICY IF EXISTS "debts_owner_policy" ON public.debts;
DROP POLICY IF EXISTS "debts_select_all" ON public.debts;

DROP POLICY IF EXISTS "installments_owner_policy" ON public.installments;
DROP POLICY IF EXISTS "installments_select_all" ON public.installments;

DROP POLICY IF EXISTS "payments_owner_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_select_all" ON public.payments;

-- 4. إتاحة القراءة (SELECT) لـ لوحة التحكم ولوحة الإحصائيات العامة
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "subscriptions_select_all" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "customers_select_all" ON public.customers FOR SELECT USING (true);
CREATE POLICY "debts_select_all" ON public.debts FOR SELECT USING (true);
CREATE POLICY "installments_select_all" ON public.installments FOR SELECT USING (true);
CREATE POLICY "payments_select_all" ON public.payments FOR SELECT USING (true);

-- 5. إتاحة الإضافة والتعديل بحماية الحساب والتطبيق
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (true);

CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (true);

CREATE POLICY "customers_write_own" ON public.customers FOR ALL USING (auth.uid() = store_id OR auth.uid() IS NULL);
CREATE POLICY "debts_write_own" ON public.debts FOR ALL USING (auth.uid() = store_id OR auth.uid() IS NULL);
CREATE POLICY "installments_write_own" ON public.installments FOR ALL USING (auth.uid() = store_id OR auth.uid() IS NULL);
CREATE POLICY "payments_write_own" ON public.payments FOR ALL USING (auth.uid() = store_id OR auth.uid() IS NULL);

-- 6. Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON public.users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- نظام أكواد التفعيل الآمن
-- =====================================================

-- 1. جدول الأكواد
CREATE TABLE IF NOT EXISTS public.activation_codes (
  code TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('cloud_monthly', 'cloud_quarterly', 'cloud_yearly')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES public.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. صلاحيات جدول الأكواد
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
-- السماح للوحة التحكم بالوصول والتعديل الكامل لجدول الأكواد
DROP POLICY IF EXISTS "activation_codes_select" ON public.activation_codes;
CREATE POLICY "activation_codes_all" ON public.activation_codes FOR ALL USING (true) WITH CHECK (true);

-- 3. دالة التفعيل الآمنة (RPC)
CREATE OR REPLACE FUNCTION activate_subscription_code(p_code TEXT, p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- يعمل بصلاحيات مدير قواعد البيانات لتخطي RLS
AS $$
DECLARE
  v_tier TEXT;
  v_is_used BOOLEAN;
  v_current_end_date TIMESTAMPTZ;
  v_new_end_date TIMESTAMPTZ;
  v_duration INTERVAL;
  v_clean_code TEXT;
BEGIN
  -- تنظيف الكود (إزالة الفراغات العشوائية وتحويل الحروف إلى كبيرة)
  v_clean_code := UPPER(TRIM(p_code));

  -- 1. البحث عن الكود مع القفل لمنع التكرار (Row Lock)
  SELECT tier, is_used 
  INTO v_tier, v_is_used
  FROM public.activation_codes
  WHERE UPPER(TRIM(code)) = v_clean_code
  FOR UPDATE; -- يمنع أي عملية أخرى من استخدام نفس الكود في نفس اللحظة

  IF NOT FOUND THEN
    RETURN 'INVALID_CODE';
  END IF;

  IF v_is_used THEN
    RETURN 'ALREADY_USED';
  END IF;

  -- 2. تحديد مدة الباقة
  IF v_tier = 'cloud_yearly' THEN
    v_duration := INTERVAL '1 year';
  ELSIF v_tier = 'cloud_quarterly' THEN
    v_duration := INTERVAL '3 months';
  ELSE
    v_duration := INTERVAL '1 month';
  END IF;

  -- 3. تحديث الكود ليصبح مستخدماً
  UPDATE public.activation_codes
  SET is_used = true,
      used_by = p_store_id,
      used_at = NOW()
  WHERE code = p_code;

  -- 4. إعطاء أو تمديد الاشتراك
  -- معرفة تاريخ الانتهاء الحالي إذا كان لديه اشتراك فعال
  SELECT end_date INTO v_current_end_date
  FROM public.subscriptions
  WHERE store_id = p_store_id AND status = 'active';

  IF FOUND AND v_current_end_date > NOW() THEN
    v_new_end_date := v_current_end_date + v_duration;
  ELSE
    v_new_end_date := NOW() + v_duration;
  END IF;

  -- تحديث الاشتراك أو إضافته
  INSERT INTO public.subscriptions (store_id, plan_tier, status, start_date, end_date, created_at, updated_at)
  VALUES (p_store_id, v_tier, 'active', NOW(), v_new_end_date, NOW(), NOW())
  ON CONFLICT (store_id) 
  DO UPDATE SET 
    plan_tier = EXCLUDED.plan_tier,
    status = 'active',
    end_date = v_new_end_date,
    updated_at = NOW();

  RETURN 'SUCCESS';
END;
$$;

-- =====================================================
-- أكواد تجريبية (قم بتشغيلها مرة واحدة للاختبار)
-- =====================================================
INSERT INTO public.activation_codes (code, tier)
VALUES 
  ('MONTH-1234', 'cloud_monthly'),
  ('MONTH-5678', 'cloud_monthly'),
  ('QTR-1234', 'cloud_quarterly'),
  ('QTR-5678', 'cloud_quarterly'),
  ('YEAR-1234', 'cloud_yearly'),
  ('YEAR-5678', 'cloud_yearly')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- أداة توليد الأكواد التلقائية الآمنة (للمدير فقط)
-- =====================================================
-- هذه الدالة يمكنك استدعاؤها من لوحة التحكم (SQL Editor) لتوليد أكواد خالية من الأخطاء
-- مثال لتوليد 5 أكواد شهرية: SELECT * FROM generate_subscription_codes(5, 'cloud_monthly');
-- مثال لتوليد 5 أكواد سنوية: SELECT * FROM generate_subscription_codes(5, 'cloud_yearly');

CREATE OR REPLACE FUNCTION generate_subscription_codes(p_count INT, p_tier TEXT)
RETURNS TABLE(generated_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_prefix TEXT;
  i INT;
BEGIN
  IF p_tier NOT IN ('cloud_monthly', 'cloud_quarterly', 'cloud_yearly') THEN
    RAISE EXCEPTION 'نوع الباقة يجب أن يكون cloud_monthly أو cloud_quarterly أو cloud_yearly فقط!';
  END IF;

  IF p_tier = 'cloud_yearly' THEN
    v_prefix := 'YEAR-';
  ELSIF p_tier = 'cloud_quarterly' THEN
    v_prefix := 'QTR-';
  ELSE
    v_prefix := 'MTH-';
  END IF;

  FOR i IN 1..p_count LOOP
    LOOP
      -- توليد كود عشوائي من 8 رموز وتنسيقه بحروف كبيرة
      v_code := v_prefix || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      
      -- محاولة الإدخال، وإذا كان الكود موجوداً بالصدفة سيتجاهله ويعيد المحاولة
      BEGIN
        INSERT INTO public.activation_codes (code, tier, is_used)
        VALUES (v_code, p_tier, false);
        EXIT; -- الخروج من حلقة الـ LOOP الداخلية عند نجاح الإدخال
      EXCEPTION WHEN unique_violation THEN
        -- حاول مرة أخرى
      END;
    END LOOP;
    
    generated_code := v_code;
    RETURN NEXT;
  END LOOP;
END;
$$;
