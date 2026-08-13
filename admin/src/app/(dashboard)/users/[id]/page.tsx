'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, User, Phone, Calendar, ShieldCheck, ShieldAlert, CreditCard, Laptop, Database, PlusCircle, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/providers/AuthProvider';
import { logAdminAction } from '@/lib/audit';
import { toast } from '@/components/ui/toast';
import { formatIQD } from '@/lib/format';

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();

  const [extendDays, setExtendDays] = useState(30);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'owner' });

  const { data: user, isLoading } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: async () => {
      const [userRes, customersCount, debtsAmounts, devicesRes] = await Promise.all([
        supabase
          .from('users')
          .select(`
            *,
            subscriptions (*)
          `)
          .eq('id', userId)
          .single(),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('store_id', userId),
        supabase.from('debts').select('total_amount, paid_amount').eq('store_id', userId),
        supabase.from('user_devices').select('*').eq('user_id', userId),
      ]);

      if (userRes.error) throw userRes.error;

      const debtRows = debtsAmounts.data || [];
      const totalDebtAmount = debtRows.reduce((acc: number, d: any) => acc + (d.total_amount || 0), 0);
      const totalPaidAmount = debtRows.reduce((acc: number, d: any) => acc + (d.paid_amount || 0), 0);

      return {
        ...userRes.data,
        customersCount: customersCount.count || 0,
        debtsCount: debtRows.length,
        totalDebtAmount,
        totalPaidAmount,
        devices: devicesRes.data || [],
      };
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (payload: typeof editForm) => {
      const { error } = await supabase
        .from('users')
        .update({
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          role: payload.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'edit_user', userId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', userId] });
      setIsEditModalOpen(false);
      toast.add({ title: 'تم تحديث بيانات المستخدم', type: 'success' });
    },
    onError: (err: any) => {
      toast.add({ title: 'فشل تحديث بيانات المستخدم', description: err.message, type: 'error' });
    },
  });

  const openEditModal = () => {
    if (!user) return;
    setEditForm({ name: user.name || '', phone: user.phone || '', role: user.role || 'owner' });
    setIsEditModalOpen(true);
  };

  const getLatestSub = () => {
    if (!user?.subscriptions) return null;
    if (Array.isArray(user.subscriptions)) {
      if (user.subscriptions.length === 0) return null;
      return [...user.subscriptions].sort(
        (a: any, b: any) => new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime()
      )[0];
    }
    return typeof user.subscriptions === 'object' ? user.subscriptions : null;
  };

  // Extend Subscription Mutation
  const extendSubMutation = useMutation({
    mutationFn: async (days: number) => {
      const currentSub = getLatestSub();
      let newEndDate = new Date();

      if (currentSub?.end_date && new Date(currentSub.end_date) > new Date()) {
        newEndDate = new Date(currentSub.end_date);
      }
      newEndDate.setDate(newEndDate.getDate() + days);

      const targetTier = (!currentSub?.plan_tier || currentSub.plan_tier === 'free')
        ? 'cloud_monthly'
        : currentSub.plan_tier;

      if (currentSub) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_tier: targetTier,
            start_date: currentSub.start_date || new Date().toISOString(),
            end_date: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert([{
            store_id: userId,
            plan_tier: 'cloud_monthly',
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: newEndDate.toISOString(),
          }]);
        if (error) throw error;
      }

      if (adminProfile) {
        await supabase.from('subscription_history').insert([{
          store_id: userId,
          plan_tier: targetTier,
          action: currentSub ? 'extended' : 'activated',
          days_added: days,
          by_admin_id: adminProfile.id,
        }]);
        await logAdminAction(adminProfile.id, 'extend_subscription', userId, { days, plan_tier: targetTier });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', userId] });
      setIsExtendModalOpen(false);
    },
    onError: (err: any) => {
      toast.add({ title: 'حدث خطأ أثناء تجديد الاشتراك', description: err.message, type: 'error' });
    },
  });

  // Cancel / Deactivate Subscription Mutation
  const cancelSubMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          plan_tier: 'free',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('store_id', userId);
      if (error) throw error;

      if (adminProfile) {
        await supabase.from('subscription_history').insert([{
          store_id: userId,
          plan_tier: getLatestSub()?.plan_tier || 'free',
          action: 'cancelled',
          by_admin_id: adminProfile.id,
        }]);
        await logAdminAction(adminProfile.id, 'cancel_subscription', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', userId] });
    },
  });

  // Toggle Account Suspend
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(
          adminProfile.id,
          newStatus === 'active' ? 'reactivate_user' : 'suspend_user',
          userId,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', userId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px] rounded-2xl" />
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold">لم يتم العثور على هذا المستخدم</h2>
        <Link href="/users" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl')}>العودة لقائمة المستخدمين</Link>
      </div>
    );
  }

  const sub = getLatestSub();
  const isSubActive = sub?.status === 'active' && sub?.plan_tier !== 'free' && sub?.end_date && new Date(sub.end_date) > new Date();
  
  // Calculate remaining days
  const remainingDays = sub?.end_date && new Date(sub.end_date) > new Date() 
    ? Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/users" className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'rounded-xl')}>
            <ArrowRight size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">ID: {user.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={openEditModal}
            className="rounded-xl text-xs font-semibold"
          >
            <Pencil className="ml-2 h-4 w-4" /> تعديل البيانات
          </Button>
          {user.status === 'active' ? (
            <Button
              variant="destructive"
              onClick={() => toggleStatusMutation.mutate('inactive')}
              disabled={toggleStatusMutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              <ShieldAlert className="ml-2 h-4 w-4" /> إيقاف الحساب
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => toggleStatusMutation.mutate('active')}
              disabled={toggleStatusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              <ShieldCheck className="ml-2 h-4 w-4" /> إعادة تفعيل الحساب
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" /> المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">رقم الهاتف</span>
                <span className="font-semibold text-sm" dir="ltr">{user.phone}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">نوع الحساب (Role)</span>
                <span className="font-semibold text-sm capitalize">{user.role}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">حالة الحساب</span>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="mt-1">
                  {user.status === 'active' ? 'نشط' : 'موقوف'}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">تاريخ الانضمام</span>
                <span className="font-semibold text-sm">{new Date(user.created_at).toLocaleString('ar-IQ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Control Card */}
        <Card className="rounded-2xl border shadow-sm border-indigo-100 dark:border-indigo-950">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" /> الاشتراك والمزامنة السحابية
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isSubActive && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => cancelSubMutation.mutate()}
                  disabled={cancelSubMutation.isPending}
                  className="rounded-xl text-xs"
                >
                  {cancelSubMutation.isPending ? 'جاري الإيقاف...' : 'إيقاف الاشتراك'}
                </Button>
              )}
              <Dialog open={isExtendModalOpen} onOpenChange={setIsExtendModalOpen}>
                <DialogTrigger render={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs"><PlusCircle className="ml-1.5 h-4 w-4" /> تمديد الاشتراك</Button>} />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>تمديد اشتراك المستخدم</DialogTitle>
                  <DialogDescription>
                    إضافة أيام إضافية لصلاحية الاشتراك السحابي لهذا الحساب.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setExtendDays(30)}>+30 يوم</Button>
                    <Button variant="outline" onClick={() => setExtendDays(90)}>+90 يوم</Button>
                    <Button variant="outline" onClick={() => setExtendDays(365)}>+سنة كاملة</Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDays">عدد الأيام المخصصة</Label>
                    <Input
                      id="customDays"
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => extendSubMutation.mutate(extendDays)}
                    disabled={extendSubMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {extendSubMutation.isPending ? 'جاري الحفظ...' : 'تأكيد التمديد'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-xs text-muted-foreground">حالة الاشتراك الحالي</p>
                <p className="font-bold text-base mt-0.5 capitalize">
                  {sub?.plan_tier ? sub.plan_tier.replace('_', ' ') : 'مجاني (محلي)'}
                </p>
              </div>
              <Badge variant={isSubActive ? 'default' : 'secondary'} className="px-3 py-1 text-xs">
                {isSubActive ? 'نشط' : 'منتهي / غير مفعل'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">تاريخ الانتهاء</span>
                <span className="font-bold text-sm">
                  {sub?.end_date ? new Date(sub.end_date).toLocaleDateString('ar-IQ') : 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">الأيام المتبقية</span>
                <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {remainingDays} يوم
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Activity Metrics */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" /> إحصائيات البيانات المخزنة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">إجمالي العملاء</span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{user.customersCount}</span>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <span className="text-xs text-indigo-800 dark:text-indigo-300 font-semibold block">إجمالي الديون والمستندات</span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{user.debtsCount}</span>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold block">إجمالي مبالغ الديون</span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{formatIQD(user.totalDebtAmount)}</span>
              </div>
              <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900/50">
                <span className="text-xs text-teal-800 dark:text-teal-300 font-semibold block">إجمالي المُحصّل</span>
                <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400">{formatIQD(user.totalPaidAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Laptop className="h-5 w-5 text-indigo-600" /> الأجهزة المرتبطة بحساب المستخدم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.devices?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لم يتم تسجِيل أجهزة مرتبطة بعد.</p>
            ) : (
              <div className="space-y-3">
                {user.devices?.map((dev: any) => (
                  <div key={dev.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border">
                    <div>
                      <p className="font-semibold text-xs">{dev.device_name || 'جهاز بدون اسم'}</p>
                      <p className="text-[10px] text-muted-foreground">{dev.platform || 'نظام آخر'}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      آخر نشاط: {new Date(dev.last_active_at).toLocaleDateString('ar-IQ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" /> تعديل بيانات المستخدم
            </DialogTitle>
            <DialogDescription>تعديل الاسم ورقم الهاتف ونوع الحساب</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editUserMutation.mutate(editForm);
            }}
            className="space-y-4 py-3"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم الكامل</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="rounded-xl"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">نوع الحساب</Label>
              <Select value={editForm.role} onValueChange={(val) => val && setEditForm({ ...editForm, role: val })}>
                <SelectTrigger id="edit-role" className="rounded-xl">
                  <SelectValue placeholder="نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">مالك المحل</SelectItem>
                  <SelectItem value="employee">موظف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={editUserMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
              >
                {editUserMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
