'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { sha256Hex } from '@/lib/hash';
import { sanitizeIlikeTerm } from '@/lib/supabase-filter';
import { logAdminAction } from '@/lib/audit';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, KeyRound, Bell, CheckCircle2, XCircle, Phone, Clock, Send, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PasswordResetsPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Response Modal State
  const [newPassword, setNewPassword] = useState('');
  const [notifTitle, setNotifTitle] = useState('تحديث طلب كلمة المرور 🔐');
  const [notifBody, setNotifBody] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['adminPasswordResets', searchTerm, page],
    queryFn: async () => {
      let query = supabase
        .from('password_reset_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        const term = sanitizeIlikeTerm(searchTerm.trim());
        query = query.or(`phone.ilike.%${term}%,notes.ilike.%${term}%`);
      }

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { requests: data || [], count: count || 0 };
    },
  });

  const requests = data?.requests;
  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / pageSize));

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) return;

      let userFoundId: string | null = null;

      // 1. If a new password is set, update user password in `users` table
      if (newPassword.trim()) {
        const { data: userRec } = await supabase
          .from('users')
          .select('id')
          .eq('phone', selectedRequest.phone)
          .maybeSingle();

        if (userRec) {
          userFoundId = userRec.id;
          const hashed = await sha256Hex(newPassword.trim());
          await supabase
            .from('users')
            .update({
              password_hash: hashed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userRec.id);
        }
      }

      // 2. Insert into system_notifications so user gets it in-app
      const finalMsg = notifBody.trim() || (newPassword.trim() ? `تم إعادة تعيين كلمة المرور الخاصة بك إلى: ${newPassword.trim()}` : 'تمت معالجة طلب استعادة كلمة المرور.');

      await supabase.from('system_notifications').insert([
        {
          user_id: userFoundId,
          title: notifTitle.trim(),
          body: finalMsg,
        },
      ]);

      // 3. Send remote Expo Push Notification if push_token exists
      if (selectedRequest.push_token) {
        try {
          await fetch('/api/send-push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokens: [selectedRequest.push_token],
              title: notifTitle.trim(),
              body: finalMsg,
              data: { type: 'password_reset' },
            }),
          });
        } catch (pushErr) {
          console.warn('Push dispatch error:', pushErr);
        }
      }

      // 4. Mark request as resolved
      const { error: updateErr } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateErr) throw updateErr;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'resolve_password_reset', userFoundId, {
          phone: selectedRequest.phone,
          password_changed: !!newPassword.trim(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPasswordResets'] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setNewPassword('');
      setNotifBody('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'reject_password_reset', null, { request_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPasswordResets'] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">طلبات استعادة كلمة المرور</h1>
          <p className="text-sm text-muted-foreground">
            إدارة طلبات نسيت كلمة المرور المرسلة من التجار وإرسال التنبيهات الخارجية لهواتفهم
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث برقم الهاتف أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الهاتف</TableHead>
                  <TableHead className="text-right">كلمة المرور القديمة / المحتملة</TableHead>
                  <TableHead className="text-right">ملاحظات التاجر</TableHead>
                  <TableHead className="text-right">الإشعارات الخارجية</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : requests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات استعادة كلمة مرور حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  requests?.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-semibold text-primary dir-ltr text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{req.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {req.old_password ? (
                          <span className="bg-muted px-2 py-0.5 rounded text-xs">{req.old_password}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">لم يُحدد</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {req.notes || 'لا توجد ملاحظات'}
                      </TableCell>
                      <TableCell>
                        {req.push_token ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            📲 مفعل
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            بدون توكن
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString('ar-IQ')} {new Date(req.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            قيد الانتظار
                          </Badge>
                        ) : req.status === 'resolved' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            تمت المعالجة ✓
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">
                            مرفوض
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedRequest(req);
                              setNotifBody(`تمت معالجة طلبك لرقم الهاتف (${req.phone}).`);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Send className="h-3.5 w-3.5 ml-1" />
                            معالجة وإشعار
                          </Button>
                          {req.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => rejectMutation.mutate(req.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-xs text-muted-foreground">
              عرض {data?.count ? (page - 1) * pageSize + 1 : 0} إلى {Math.min(page * pageSize, data?.count || 0)} من إجمالي {data?.count || 0} طلب
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-lg text-xs"
              >
                السابق
              </Button>
              <span className="text-xs font-bold px-2">صفحة {page} من {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="rounded-lg text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response & Reset Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <KeyRound className="h-5 w-5 text-primary" />
              معالجة طلب التاجر ({selectedRequest?.phone})
            </DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة أو نص الإشعار الذي سيصل لهاتف التاجر فورياً خارج التطبيق.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة (تحديث قاعدة البيانات)</Label>
              <Input
                placeholder="أدخل كلمة مرور جديدة للتاجر (اختياري)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>عنوان الإشعار</Label>
              <Input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>نص الإشعار الواصل للتاجر</Label>
              <Textarea
                rows={3}
                placeholder="اكتب تفاصيل الرد أو كلمة المرور الجديدة..."
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
              onClick={() => {
                if (!selectedRequest?.phone) return;
                const pwdText = newPassword.trim() ? `كلمة المرور الجديدة الخاصة بك هي: ${newPassword.trim()}\n\nيرجى تغييرها بعد الدخول للحفاظ على سرية معلوماتك.` : `${notifBody.trim()}`;
                const text = `مرحباً،\nبخصوص طلب استعادة كلمة المرور الخاص بك في تطبيق رافدين للتمويل:\n\n${pwdText}`;
                
                let phone = selectedRequest.phone.replace(/[^0-9]/g, '');
                if (phone.startsWith('0')) {
                  phone = '964' + phone.substring(1);
                }
                
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
              }}
              disabled={!selectedRequest}
              type="button"
            >
              مراسلة عبر واتساب
            </Button>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate()}
              >
                {resolveMutation.isPending ? 'جاري الإرسال والمعالجة...' : 'إرسال وتعيين المعالجة ✓'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
