'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bell, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').insert([{
        title: title.trim(),
        body: body.trim(),
        target_type: targetType,
        target_user_id: targetType === 'user' && targetUserId.trim() ? targetUserId.trim() : null,
        status: 'sent',
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle('');
      setBody('');
      setTargetUserId('');
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    sendNotificationMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">مركز إرسال الإشعارات للمستخدمين</h1>
        <p className="text-sm text-muted-foreground mt-1">توجيه التنبيهات المباشرة لجميع المستخدمين أو لمستخدم محدد</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                <Bell size={24} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">نموذج إرسال إشعار جديد</CardTitle>
                <CardDescription>اكتب عنوان ورسالة التنبيه وحدد الفئة المستهدفة</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSend}>
            <CardContent className="space-y-4">
              {sentSuccess && (
                <div className="p-3 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تم إرسال الإشعار بنجاح!</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="target">الفئة المستهدفة</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger id="target" className="rounded-xl">
                    <SelectValue placeholder="اختر الفئة المستهدفة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع مستخدمي التطبيق</SelectItem>
                    <SelectItem value="group">مجموعة الحسابات النشطة</SelectItem>
                    <SelectItem value="user">مستخدم محدد (عبر User ID)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="targetUser">User ID للمستلم</Label>
                  <Input
                    id="targetUser"
                    placeholder="مثال: e2a87c12-..."
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="rounded-xl font-mono text-xs"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">عنوان الإشعار</Label>
                <Input
                  id="title"
                  placeholder="مثال: تحديث هام بشأن الاشتراك السحابي"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">نص الرسالة</Label>
                <Textarea
                  id="body"
                  placeholder="اكتب تفاصيل التنبيه الموجه للمستخدم..."
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md w-full"
              >
                <Send className="ml-2 h-4 w-4" />
                {sendNotificationMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
