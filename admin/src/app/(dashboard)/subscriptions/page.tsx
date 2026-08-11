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
import { CreditCard, Eye, PlusCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['adminSubscriptionsList', page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          users!inner(id, name, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { subscriptions: data, count };
    },
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionsList'] });
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
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" /> قائمة الاشتراكات المسجلة
          </CardTitle>
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
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => cancelSubMutation.mutate(sub.id)}
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
    </div>
  );
}
