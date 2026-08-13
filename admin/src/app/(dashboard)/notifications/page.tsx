'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Bell, CheckCircle2, Search, Users, UserCheck, Smartphone, AlertCircle, History, Megaphone, User as UserIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/audit';
import { useAuth } from '@/components/providers/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  push_token?: string | null;
  created_at: string;
}

const MAX_RECIPIENTS_LOADED = 500;

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'custom'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['admin-users-for-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, role, status, push_token, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_RECIPIENTS_LOADED);

      if (error) throw error;
      return data || [];
    },
  });

  // Notification campaign history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['adminNotificationHistory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, target_type, target_user_id, status, created_at, users:target_user_id(name, phone)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const targetTypeLabel = (t: string) =>
    t === 'all' ? 'جميع المستخدمين' : t === 'user' ? 'مستخدم محدد' : 'مجموعة مستخدمين';

  // Filter users by search query
  const filteredUsers = users.filter(
    (u) =>
      !searchQuery.trim() ||
      (u.name && u.name.includes(searchQuery.trim())) ||
      (u.phone && u.phone.includes(searchQuery.trim()))
  );

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  // Send Notification Mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      setSentSuccess(null);
      setErrorMessage(null);

      const targetUsers =
        targetType === 'all'
          ? users
          : users.filter((u) => selectedUserIds.includes(u.id));

      if (targetUsers.length === 0) {
        throw new Error('يرجى تحديد مستخدم واحد على الأقل لإرسال الإشعار');
      }

      // 1. Save to Supabase system_notifications table for in-app history
      const dbEntries: { user_id: string | null; title: string; body: string; created_at: string }[] =
        targetType === 'all'
          ? [
              {
                user_id: null,
                title: title.trim(),
                body: body.trim(),
                created_at: new Date().toISOString(),
              },
            ]
          : targetUsers.map((u) => ({
              user_id: u.id,
              title: title.trim(),
              body: body.trim(),
              created_at: new Date().toISOString(),
            }));

      const { error: dbError } = await supabase
        .from('system_notifications')
        .insert(dbEntries);

      if (dbError) {
        console.error('[Admin Notifications] DB insert error:', dbError);
        throw new Error(`فشل الحفظ في قاعدة البيانات: ${dbError.message}`);
      }

      // Campaign/history record — target_type must match the DB check constraint
      // ('all' | 'group' | 'user'), so map the UI's 'custom' mode accordingly.
      const campaignTargetType =
        targetType === 'all' ? 'all' : selectedUserIds.length === 1 ? 'user' : 'group';

      const { error: campaignError } = await supabase.from('notifications').insert([
        {
          title: title.trim(),
          body: body.trim(),
          target_type: campaignTargetType,
          target_user_id: campaignTargetType === 'user' ? selectedUserIds[0] : null,
          status: 'sent',
        },
      ]);

      let campaignWarning: string | null = null;
      if (campaignError) {
        console.error('[Admin Notifications] campaign record insert error:', campaignError);
        campaignWarning = 'تم إرسال الإشعار لكن تعذر حفظ سجل الحملة في سجل الإشعارات.';
      }

      // 2. Send Direct Expo Push Notifications to devices with active Push Tokens
      const pushTokens = targetUsers
        .map((u) => u.push_token)
        .filter((token): token is string => !!token && token.startsWith('ExponentPushToken'));

      let pushSuccessCount = 0;
      const pushErrors: string[] = [];

      // الإرسال يتم عبر API Route على الخادم وليس من المتصفح مباشرةً:
      // خدمة exp.host لا ترسل ترويسة Access-Control-Allow-Origin، فيحجب
      // المتصفح الطلب في مرحلة الـ preflight ولا يصل أي إشعار.
      if (pushTokens.length > 0) {
        try {
          const res = await fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: pushTokens,
              title: title.trim(),
              body: body.trim(),
            }),
          });

          const result = await res.json();
          console.log('[Admin Notifications] Push result:', result);

          if (!res.ok) {
            pushErrors.push(result?.error || `فشل الإرسال (HTTP ${res.status})`);
          } else {
            pushSuccessCount = result?.sent || 0;
            if (Array.isArray(result?.errors)) pushErrors.push(...result.errors);
          }
        } catch (pushErr: any) {
          pushErrors.push(pushErr?.message || 'تعذر الوصول إلى خادم الإرسال');
          console.warn('[Admin Notifications] send-push error:', pushErr);
        }
      }

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'send_notification', campaignTargetType === 'user' ? selectedUserIds[0] : null, {
          title: title.trim(),
          target_type: campaignTargetType,
          recipient_count: targetUsers.length,
        });
      }

      return {
        totalTargets: targetUsers.length,
        tokensSent: pushSuccessCount,
        tokensAttempted: pushTokens.length,
        pushErrors: [...new Set(pushErrors)].slice(0, 3),
        campaignWarning,
      };
    },
    onSuccess: (data) => {
      setTitle('');
      setBody('');

      const noTokens = data.tokensAttempted === 0;
      setSentSuccess(
        `تم حفظ الإشعار لـ (${data.totalTargets}) مستخدم — وصل فورياً لـ (${data.tokensSent}) جهاز من أصل (${data.tokensAttempted}) جهاز مُفعّل.`
          + (noTokens
            ? ' ⚠️ لا يوجد أي جهاز يملك Push Token، لذلك لم يصل أي تنبيه خارجي.'
            : '')
          + (data.pushErrors.length ? ` — أخطاء: ${data.pushErrors.join(' | ')}` : '')
          + (data.campaignWarning ? ` — ${data.campaignWarning}` : '')
      );
      queryClient.invalidateQueries({ queryKey: ['adminNotificationHistory'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الإشعار');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErrorMessage('يرجى كتابة العنوان ونص الرسالة');
      return;
    }
    if (targetType === 'custom' && selectedUserIds.length === 0) {
      setErrorMessage('يرجى تحديد مستخدم واحد على الأقل من القائمة');
      return;
    }
    sendNotificationMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">مركز إرسال الإشعارات المخصص</h1>
        <p className="text-sm text-muted-foreground mt-1">
          عرض قائمة التجار والمستخدمين بأسمائهم ورقامهم وتحديد المستهدفين لإرسال إشعارات فورية
        </p>
      </div>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> إرسال إشعار
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> سجل الإشعارات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form & Targeting */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                  <Bell size={22} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">إنشاء إشعار جديد</CardTitle>
                  <CardDescription>اكتب رسالتك وحدد المستهدفين</CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSend}>
              <CardContent className="space-y-4">
                {sentSuccess && (
                  <div className="p-3 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{sentSuccess}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 text-sm bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Target Mode Selector */}
                <div className="space-y-2">
                  <Label>وضع المستهدفين</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('all')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        targetType === 'all'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Users size={16} />
                      <span>جميع المستخدمين ({users.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('custom')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        targetType === 'custom'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <UserCheck size={16} />
                      <span>تحديد مخصص ({selectedUserIds.length})</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الإشعار *</Label>
                  <Input
                    id="title"
                    placeholder="مثال: تنبيه هام من إدارة الرافدين"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">نص الرسالة *</Label>
                  <Textarea
                    id="body"
                    placeholder="اكتب تفاصيل التنبيه الذي سيصل للمستخدم في هاتفه..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="rounded-xl"
                    rows={4}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t">
                <Button
                  type="submit"
                  disabled={sendNotificationMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md w-full h-11"
                >
                  <Send className="ml-2 h-4 w-4" />
                  {sendNotificationMutation.isPending
                    ? 'جاري الإرسال...'
                    : `إرسال الإشعار (${
                        targetType === 'all' ? users.length : selectedUserIds.length
                      } مستخدم)`}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Interactive Users List */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" />
                    <span>قائمة المستخدمين المتاحين</span>
                  </CardTitle>
                  <CardDescription>
                    اختر المستخدمين بالاسم ورقم الهاتف لإرسال إشعار مباشر لهم
                  </CardDescription>
                </div>

                {targetType === 'custom' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="rounded-xl text-xs"
                  >
                    {selectedUserIds.length === filteredUsers.length
                      ? 'إلغاء تحديد الكل'
                      : 'تحديد جميع النتائج'}
                  </Button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative mt-3">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 rounded-xl bg-muted/40"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  جاري تحميل قائمة المستخدمين...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا يوجد مستخدمين يطابقون بحثك
                </div>
              ) : (
                <div className="divide-y max-h-[420px] overflow-y-auto">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const hasPushToken = !!u.push_token;

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (targetType !== 'custom') setTargetType('custom');
                          toggleSelectUser(u.id);
                        }}
                        className={`p-3.5 px-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected && targetType === 'custom'
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={targetType === 'all' || isSelected}
                            onChange={() => {
                              if (targetType !== 'custom') setTargetType('custom');
                              toggleSelectUser(u.id);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {u.name || 'مستخدم بدون اسم'}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 font-normal rounded-md"
                              >
                                {u.role === 'owner' ? 'مالك المحل' : u.role}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 dir-ltr text-right">
                              {u.phone}
                            </div>
                          </div>
                        </div>

                        {/* Push Token Status Badge */}
                        <div className="flex items-center gap-1.5 text-xs">
                          {hasPushToken ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Smartphone size={12} />
                              <span>جاهز للإشعارات</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              <span>لم يفعل التنبيهات</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>

            <CardFooter className="p-3 bg-muted/20 border-t text-xs text-muted-foreground flex justify-between">
              <span>إجمالي المستخدمين المسجلين: {users.length}</span>
              <span>
                {targetType === 'all'
                  ? 'مستهدفين حالياً: جميع الحسابات'
                  : `محدد حالياً: ${selectedUserIds.length} مستخدم`}
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" /> آخر 100 إشعار مُرسل
              </CardTitle>
              <CardDescription>سجل كل حملات الإشعارات التي أرسلها فريق الإدارة</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingHistory ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : !history?.length ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا يوجد إشعارات مرسلة بعد
                </div>
              ) : (
                <div className="divide-y max-h-[520px] overflow-y-auto">
                  {history.map((n: any) => (
                    <div key={n.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          {n.target_type === 'user' ? <UserIcon size={16} /> : <Megaphone size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal rounded-md">
                              {targetTypeLabel(n.target_type)}
                              {n.target_type === 'user' && n.users?.name ? ` — ${n.users.name}` : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleDateString('ar-IQ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
