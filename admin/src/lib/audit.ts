import { supabase } from '@/lib/supabase';

export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        action,
        target_user_id: targetUserId ?? null,
        details: details ?? null,
      },
    ]);
  } catch (err) {
    console.warn('[audit] failed to log admin action:', action, err);
  }
}
