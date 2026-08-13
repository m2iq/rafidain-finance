-- ============================================================
-- إصلاح صلاحيات (RLS) الخاصة بالإشعارات
-- ============================================================
-- المشكلة: التطبيق ولوحة الإدارة يستخدمان anon key مع مصادقة
-- مخصّصة (هاتف/كلمة مرور) وليس Supabase Auth، لذلك auth.uid()
-- تساوي NULL دائماً. أي سياسة مبنية على auth.uid() ترفض العملية
-- بصمت (بدون خطأ واضح) فتكون النتيجة:
--   1) push_token لا يُحفظ أبداً في جدول users
--   2) إدراج الإشعار في system_notifications يفشل من لوحة الإدارة
--
-- شغّل هذا الملف في: Supabase Dashboard > SQL Editor
-- ============================================================


-- ---------- 1) تشخيص: اعرض السياسات الحالية ----------
-- شغّل هذا أولاً لترى الوضع الحالي قبل التعديل
SELECT tablename, policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'system_notifications')
ORDER BY tablename, policyname;


-- ---------- 2) التحقق من وجود عمود push_token ----------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;


-- ---------- 3) السماح بحفظ push_token من التطبيق ----------
-- بدون هذه السياسة يبقى كل مستخدم بحالة "لم يفعل التنبيهات"
DROP POLICY IF EXISTS "users_update_push_token" ON public.users;
CREATE POLICY "users_update_push_token" ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ---------- 4) السماح للوحة الإدارة بإدراج الإشعارات ----------
-- الجدول كان يملك سياسة SELECT فقط، فكان الإدراج مرفوضاً
DROP POLICY IF EXISTS "system_notifications_insert_policy" ON public.system_notifications;
CREATE POLICY "system_notifications_insert_policy" ON public.system_notifications
  FOR INSERT
  WITH CHECK (true);


-- ---------- 5) جدول سجل حملات الإشعارات ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'group', 'user')),
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_admin_policy" ON public.notifications;
CREATE POLICY "notifications_admin_policy" ON public.notifications
  FOR ALL USING (true) WITH CHECK (true);


-- ---------- 6) تحقق نهائي ----------
-- بعد فتح التطبيق على الهاتف مرة واحدة، يجب أن يظهر توكن هنا
SELECT id, name, phone,
       CASE WHEN push_token IS NULL THEN '❌ لا يوجد توكن'
            WHEN push_token LIKE 'ExponentPushToken%' THEN '✅ جاهز'
            ELSE '⚠️ توكن غير متوقع: ' || left(push_token, 20)
       END AS token_status
FROM public.users
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================
-- ⚠️ ملاحظة أمنية مهمة
-- ============================================================
-- السياسات أعلاه مفتوحة (USING true) لأنها تطابق البنية الحالية
-- التي تعتمد anon key مع مصادقة مخصّصة. هذا يعني أن أي شخص يملك
-- الـ anon key يستطيع تعديل push_token أو إدراج إشعارات.
--
-- الحل الصحيح لاحقاً: نقل الإرسال والإدراج إلى Next.js API Route
-- في لوحة الإدارة تستخدم SUPABASE_SERVICE_ROLE_KEY على الخادم فقط،
-- ثم تشديد هذه السياسات مرة أخرى.
-- ============================================================
