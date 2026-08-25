-- ============================================================
-- إضافة أعمدة حفظ قوالب رسائل الواتساب لجدول users في Supabase
-- ============================================================
-- شغّل هذا الملف في: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_order_message TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_payment_message TEXT;
