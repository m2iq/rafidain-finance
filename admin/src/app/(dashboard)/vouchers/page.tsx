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
import { Search, Ticket, Copy, Trash2, Plus, Check, RefreshCw, History, Users as UsersIcon, CheckCircle2, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { sanitizeIlikeTerm } from '@/lib/supabase-filter';
import { logAdminAction } from '@/lib/audit';
import { useAuth } from '@/components/providers/AuthProvider';
import { StatCard } from '@/components/ui/stat-card';

export default function VouchersPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [historyVoucher, setHistoryVoucher] = useState<{ id: string; code: string } | null>(null);

  const { data: kpis } = useQuery({
    queryKey: ['adminVouchersKpis'],
    queryFn: async () => {
      const [totalRes, activeRes, usagesRes] = await Promise.all([
        supabase.from('voucher_codes').select('*', { count: 'exact', head: true }),
        supabase.from('voucher_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('voucher_codes').select('current_usages'),
      ]);
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        totalUsages: (usagesRes.data || []).reduce((acc: number, v: any) => acc + (v.current_usages || 0), 0),
      };
    },
  });

  const { data: redemptions, isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ['adminVoucherRedemptions', historyVoucher?.id],
    enabled: !!historyVoucher,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voucher_redemptions')
        .select('id, redeemed_at, users(id, name, phone)')
        .eq('voucher_id', historyVoucher!.id)
        .order('redeemed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const [newVoucher, setNewVoucher] = useState({
    code: '',
    duration_days: 30,
    max_usages: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['adminVouchers', searchTerm, page],
    queryFn: async () => {
      let query = supabase
        .from('voucher_codes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        query = query.ilike('code', `%${sanitizeIlikeTerm(searchTerm.trim())}%`);
      }

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { vouchers: data || [], count: count || 0 };
    },
  });

  const vouchers = data?.vouchers;
  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / pageSize));

  const createVoucherMutation = useMutation({
    mutationFn: async (voucher: typeof newVoucher) => {
      const { data, error } = await supabase.from('voucher_codes').insert([{
        code: voucher.code.toUpperCase().trim(),
        duration_days: voucher.duration_days,
        max_usages: voucher.max_usages,
        status: 'active',
      }]).select();

      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'create_voucher', null, {
          code: voucher.code.toUpperCase().trim(),
          duration_days: voucher.duration_days,
          max_usages: voucher.max_usages,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVouchers'] });
      setIsDialogOpen(false);
      setNewVoucher({ code: '', duration_days: 30, max_usages: 1 });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, code }: { id: string; status: string; code: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase.from('voucher_codes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'toggle_voucher', null, { code, status: newStatus });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVouchers'] });
    },
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: async ({ id, code }: { id: string; code: string }) => {
      const { error } = await supabase.from('voucher_codes').delete().eq('id', id);
      if (error) throw error;

      if (adminProfile) {
        await logAdminAction(adminProfile.id, 'delete_voucher', null, { code });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVouchers'] });
    },
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `RAFIDAIN-${newVoucher.duration_days}D-${randomPart}`;
    setNewVoucher({ ...newVoucher, code });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">نظام أكواد التفعيل (Vouchers)</h1>
          <p className="text-sm text-muted-foreground mt-1">إنشاء وتحديد الأيام وتتبع مرات الاستخدام لأكواد التفعيل</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"><Plus className="ml-1.5 h-4 w-4" /> إنشاء كود تفعيل جديد</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء كود تفعيل جديد</DialogTitle>
              <DialogDescription>
                حدد مدة الكود وعدد مرات الاستخدام المسموحة.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (newVoucher.code) createVoucherMutation.mutate(newVoucher); }} className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="code">كود التفعيل (Code)</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                    placeholder="RAFIDAIN-30D-XXXX"
                    className="rounded-xl uppercase font-mono"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode} className="rounded-xl shrink-0">
                    <RefreshCw className="h-4 w-4 ml-1" /> توليد
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">مدة الكود (أيام)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={newVoucher.duration_days}
                    onChange={(e) => setNewVoucher({ ...newVoucher, duration_days: parseInt(e.target.value) || 0 })}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usages">أقصى عدد مرات استخدام</Label>
                  <Input
                    id="usages"
                    type="number"
                    min="1"
                    value={newVoucher.max_usages}
                    onChange={(e) => setNewVoucher({ ...newVoucher, max_usages: parseInt(e.target.value) || 0 })}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={createVoucherMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                  {createVoucherMutation.isPending ? 'جاري الحفظ...' : 'حفظ ونشر الكود'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="إجمالي الأكواد" value={kpis?.total ?? 0} icon={Ticket} color="indigo" />
        <StatCard title="أكواد مفعلة" value={kpis?.active ?? 0} icon={CheckCircle2} color="emerald" />
        <StatCard title="إجمالي مرات الاستخدام" value={kpis?.totalUsages ?? 0} icon={Repeat} color="violet" />
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="py-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالكود..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pr-9 h-10 rounded-xl font-mono"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>كود التفعيل</TableHead>
                <TableHead>مدة الاشتراك</TableHead>
                <TableHead>مرات الاستخدام</TableHead>
                <TableHead>حالة الكود</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-left"><Skeleton className="h-8 w-16 mr-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vouchers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    لا يوجد أكواد تفعيل مضافة بعد.
                  </TableCell>
                </TableRow>
              ) : (
                vouchers?.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {v.code}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">{v.duration_days} يوم</TableCell>
                    <TableCell className="text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryVoucher({ id: v.id, code: v.code })}
                        className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        title="عرض سجل الاستخدام"
                      >
                        {v.current_usages} / {v.max_usages}
                        <History className="h-3 w-3 opacity-60" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={v.status === 'active' ? 'default' : v.status === 'expired' ? 'secondary' : 'destructive'}
                        className="cursor-pointer"
                        onClick={() => toggleStatusMutation.mutate({ id: v.id, status: v.status, code: v.code })}
                      >
                        {v.status === 'active' ? 'مفعل' : v.status === 'expired' ? 'منتهي' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString('ar-IQ')}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopy(v.code)}
                          title="نسخ الكود"
                        >
                          {copiedCode === v.code ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => deleteVoucherMutation.mutate({ id: v.id, code: v.code })}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              عرض {data?.count ? (page - 1) * pageSize + 1 : 0} إلى {Math.min(page * pageSize, data?.count || 0)} من إجمالي {data?.count || 0} كود
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

      {/* Redemption History Dialog */}
      <Dialog open={!!historyVoucher} onOpenChange={(open) => !open && setHistoryVoucher(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-indigo-600" />
              سجل استخدام الكود{' '}
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{historyVoucher?.code}</span>
            </DialogTitle>
            <DialogDescription>قائمة المستخدمين الذين فعّلوا هذا الكود وتاريخ التفعيل</DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
            {isLoadingRedemptions ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)
            ) : !redemptions?.length ? (
              <p className="text-center text-sm text-muted-foreground py-8">لم يتم استخدام هذا الكود بعد.</p>
            ) : (
              redemptions.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border">
                  <div>
                    <p className="font-semibold text-sm">{r.users?.name || 'مستخدم محذوف'}</p>
                    <p className="text-xs text-muted-foreground dir-ltr text-right">{r.users?.phone || '—'}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.redeemed_at).toLocaleDateString('ar-IQ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
