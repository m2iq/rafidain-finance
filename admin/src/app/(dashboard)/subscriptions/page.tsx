'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { CreditCard, Eye, PlusCircle, XCircle, Pencil, Search, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { logAdminAction } from '@/lib/audit';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sanitizeIlikeTerm } from '@/lib/supabase-filter';
import { toast } from '@/components/ui/toast';
import { StatCard } from '@/components/ui/stat-card';

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const { data: plans } = useQuery({
    queryKey: ['adminSubscriptionPlansForFilter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('tier_key, name').order('price');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ['adminSubscriptionsKpis'],
    queryFn: async () => {
      const [activeRes, cancelledRes, expiredRes] = await Promise.all([
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
      ]);
      return {
        active: activeRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
        expired: expiredRes.count ?? 0,
      };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['adminSubscriptionsList', page, statusFilter, planFilter],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          users!inner(id, name, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (planFilter !== 'all') query = query.eq('plan_tier', planFilter);

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;
      return { subscriptions: data, count };
    },
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (sub: any) => {
      const { error } = await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
      if (error) throw error;

      if (adminProfile) {
        await supabase.from('subscription_history').insert([{
          store_id: sub.store_id,
          plan_tier: sub.plan_tier || 'free',
          action: 'cancelled',
          by_admin_id: adminProfile.id,
        }]);
        await logAdminAction(adminProfile.id, 'cancel_subscription', sub.store_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionsList'] });
    },
  });

  // Edit an existing subscription (plan/status/end date)
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editForm, setEditForm] = useState({ plan_tier: '', status: 'active', end_date: '' });

  const openEditDialog = (sub: any) => {
    setEditingSub(sub);
    setEditForm({
      plan_tier: sub.plan_tier || 'free',
      status: sub.status || 'active',
      end_date: sub.end_date ? sub.end_date.slice(0, 10) : '',
    });
  };

  const editSubMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_tier: editForm.plan_tier,
          status: editForm.status,
          end_date: editForm.end_date ? new Date(editForm.end_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingSub.id);
      if (error) throw error;

      if (adminProfile) {
        await supabase.from('subscription_history').insert([{
          store_id: editingSub.store_id,
          plan_tier: editForm.plan_tier,
          action: 'edited',
          by_admin_id: adminProfile.id,
        }]);
        await logAdminAction(adminProfile.id, 'edit_subscription', editingSub.store_id, editForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionsList'] });
      setEditingSub(null);
      toast.add({ title: 'تم تحديث الاشتراك بنجاح', type: 'success' });
    },
    onError: (err: any) => {
      toast.add({ title: 'فشل تحديث الاشتراك', description: err.message, type: 'error' });
    },
  });

  // Create a subscription for a user who doesn't have one yet
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [createForm, setCreateForm] = useState({ plan_tier: 'cloud_monthly', end_date: '' });

  const { data: userSearchResults } = useQuery({
    queryKey: ['adminUserSearchForSub', userSearch],
    enabled: isCreateOpen && userSearch.trim().length > 1,
    queryFn: async () => {
      const term = sanitizeIlikeTerm(userSearch.trim());
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone')
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const createSubMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('يرجى اختيار مستخدم أولاً');
      if (!createForm.end_date) throw new Error('يرجى تحديد تاريخ الانتهاء');

      const { error } = await supabase.from('subscriptions').insert([{
        store_id: selectedUser.id,
        plan_tier: createForm.plan_tier,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(createForm.end_date).toISOString(),
      }]);
      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا المستخدم لديه اشتراك مسجل بالفعل — عدّله من قائمة الاشتراكات بدلاً من إنشاء اشتراك جديد');
        }
        throw error;
      }

      if (adminProfile) {
        await supabase.from('subscription_history').insert([{
          store_id: selectedUser.id,
          plan_tier: createForm.plan_tier,
          action: 'activated',
          by_admin_id: adminProfile.id,
        }]);
        await logAdminAction(adminProfile.id, 'create_subscription', selectedUser.id, createForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionsList'] });
      setIsCreateOpen(false);
      setSelectedUser(null);
      setUserSearch('');
      setCreateForm({ plan_tier: 'cloud_monthly', end_date: '' });
      toast.add({ title: 'تم إنشاء الاشتراك بنجاح', type: 'success' });
    },
    onError: (err: any) => {
      toast.add({ title: 'فشل إنشاء الاشتراك', description: err.message, type: 'error' });
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة جميع الاشتراكات</h1>
          <p className="text-sm text-muted-foreground mt-1">متابعة وتمديد وإلغاء اشتراكات المزامنة السحابية للمستخدمين</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setSelectedUser(null); setUserSearch(''); } }}>
          <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"><PlusCircle className="ml-1.5 h-4 w-4" /> إنشاء اشتراك جديد</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء اشتراك جديد لمستخدم</DialogTitle>
              <DialogDescription>ابحث عن المستخدم ثم حدد الباقة وتاريخ الانتهاء</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              {!selectedUser ? (
                <div className="space-y-2">
                  <Label>البحث عن مستخدم</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="اسم المستخدم أو رقم الهاتف..."
                      className="pr-9 rounded-xl"
                    />
                  </div>
                  {userSearch.trim().length > 1 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                      {userSearchResults?.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">لا يوجد نتائج</p>
                      ) : (
                        userSearchResults?.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted text-right"
                          >
                            <span className="text-sm font-semibold">{u.name}</span>
                            <span className="text-xs text-muted-foreground dir-ltr">{u.phone}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div>
                      <p className="text-sm font-bold">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground dir-ltr">{selectedUser.phone}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="text-xs">
                      تغيير
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>الباقة</Label>
                    <Select value={createForm.plan_tier} onValueChange={(val) => val && setCreateForm({ ...createForm, plan_tier: val })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="اختر الباقة" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans?.map((p: any) => (
                          <SelectItem key={p.tier_key} value={p.tier_key}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ الانتهاء</Label>
                    <Input
                      type="date"
                      value={createForm.end_date}
                      onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => createSubMutation.mutate()}
                disabled={createSubMutation.isPending || !selectedUser}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
              >
                {createSubMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الاشتراك'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="اشتراكات نشطة" value={kpis?.active ?? 0} icon={CreditCard} color="emerald" />
        <StatCard title="اشتراكات ملغاة" value={kpis?.cancelled ?? 0} icon={XCircle} color="rose" />
        <StatCard title="اشتراكات منتهية" value={kpis?.expired ?? 0} icon={Clock} color="amber" />
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" /> قائمة الاشتراكات المسجلة
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(val) => { if (val) { setStatusFilter(val); setPage(1); } }}>
              <SelectTrigger className="rounded-xl h-9 w-full sm:w-44">
                <SelectValue placeholder="حالة الاشتراك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(val) => { if (val) { setPlanFilter(val); setPage(1); } }}>
              <SelectTrigger className="rounded-xl h-9 w-full sm:w-52">
                <SelectValue placeholder="الباقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الباقات</SelectItem>
                {plans?.map((p: any) => (
                  <SelectItem key={p.tier_key} value={p.tier_key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>صاحب المتجر</TableHead>
                <TableHead>الباقة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ البداية</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-left"><Skeleton className="h-8 w-16 mr-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.subscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    لا يوجد اشتراكات مسجلة بعد.
                  </TableCell>
                </TableRow>
              ) : (
                data?.subscriptions?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{sub.users?.name}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground text-right">{sub.users?.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize text-xs font-semibold">
                      {sub.plan_tier ? sub.plan_tier.replace('_', ' ') : 'free'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'active' ? 'default' : sub.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {sub.status === 'active' ? 'نشط' : sub.status === 'cancelled' ? 'ملغى' : 'منتهي'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sub.start_date).toLocaleDateString('ar-IQ')}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {sub.end_date ? new Date(sub.end_date).toLocaleDateString('ar-IQ') : 'غير محدد'}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/users/${sub.users?.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-lg text-xs')}
                        >
                          <Eye className="ml-1 h-3.5 w-3.5" /> التفاصيل
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => openEditDialog(sub)}
                          title="تعديل الاشتراك"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => cancelSubMutation.mutate(sub)}
                            title="إلغاء الاشتراك"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-xs text-muted-foreground">
              عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, data?.count || 0)} من إجمالي {data?.count || 0} اشتراك
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-lg text-xs"
              >
                السابق
              </Button>
              <span className="text-xs font-bold px-2">صفحة {page} من {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="rounded-lg text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingSub} onOpenChange={(open) => !open && setEditingSub(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل اشتراك {editingSub?.users?.name}</DialogTitle>
            <DialogDescription>تغيير الباقة أو الحالة أو تاريخ الانتهاء مباشرة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>الباقة</Label>
              <Select value={editForm.plan_tier} onValueChange={(val) => val && setEditForm({ ...editForm, plan_tier: val })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الباقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">مجاني</SelectItem>
                  {plans?.map((p: any) => (
                    <SelectItem key={p.tier_key} value={p.tier_key}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={(val) => val && setEditForm({ ...editForm, status: val })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانتهاء</Label>
              <Input
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => editSubMutation.mutate()}
              disabled={editSubMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
            >
              {editSubMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
