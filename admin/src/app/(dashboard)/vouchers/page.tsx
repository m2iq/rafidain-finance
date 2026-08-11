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
import { Search, Ticket, Copy, Trash2, Plus, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function VouchersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newVoucher, setNewVoucher] = useState({
    code: '',
    duration_days: 30,
    max_usages: 1,
  });

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['adminVouchers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('voucher_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        query = query.ilike('code', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createVoucherMutation = useMutation({
    mutationFn: async (voucher: typeof newVoucher) => {
      const { data, error } = await supabase.from('voucher_codes').insert([{
        code: voucher.code.toUpperCase().trim(),
        duration_days: voucher.duration_days,
        max_usages: voucher.max_usages,
        status: 'active',
      }]).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVouchers'] });
      setIsDialogOpen(false);
      setNewVoucher({ code: '', duration_days: 30, max_usages: 1 });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase.from('voucher_codes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVouchers'] });
    },
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('voucher_codes').delete().eq('id', id);
      if (error) throw error;
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

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="py-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالكود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{v.current_usages}</span> / {v.max_usages}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={v.status === 'active' ? 'default' : v.status === 'expired' ? 'secondary' : 'destructive'}
                        className="cursor-pointer"
                        onClick={() => toggleStatusMutation.mutate({ id: v.id, status: v.status })}
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
                          onClick={() => deleteVoucherMutation.mutate(v.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
