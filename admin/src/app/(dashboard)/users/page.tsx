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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, ShieldAlert, ShieldCheck, Eye, Trash2, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsersList', page, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          *,
          subscriptions (*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        // Allow searching by UUID id, name, or phone
        query = query.or(`id.eq.${term},name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      return { users: data, count };
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة جميع المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-1">البحث والفلترة والتحكم الكامل في حسابات أصحاب المتاجر</p>
        </div>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، رقم الهاتف، أو ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pr-9 h-10 rounded-xl"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="حالة الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">الحسابات النشطة</SelectItem>
                  <SelectItem value="inactive">الحسابات الموقوفة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>الاسم</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>الرول (Role)</TableHead>
                <TableHead>حالة الحساب</TableHead>
                <TableHead>الاشتراك الحالي</TableHead>
                <TableHead>تاريخ الانضمام</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell className="text-left"><Skeleton className="h-8 w-8 mr-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    لا يوجد مستخدمين مطبق عليهم هذا البحث.
                  </TableCell>
                </TableRow>
              ) : (
                data?.users?.map((u: any) => {
                  const sub = Array.isArray(u.subscriptions)
                    ? (u.subscriptions.length > 0 ? [...u.subscriptions].sort((a: any, b: any) => new Date(b.created_at || b.end_date || 0).getTime() - new Date(a.created_at || a.end_date || 0).getTime())[0] : null)
                    : (u.subscriptions && typeof u.subscriptions === 'object' ? u.subscriptions : null);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {u.name}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{u.phone}</TableCell>
                      <TableCell className="capitalize text-xs font-medium">{u.role}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="rounded-md">
                          {u.status === 'active' ? 'نشط' : 'موقوف'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub ? (
                          <div className="text-xs">
                            <span className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">{sub.plan_tier.replace('_', ' ')}</span>
                            <span className="text-muted-foreground block text-[10px]">
                              ينتهي: {sub.end_date ? new Date(sub.end_date).toLocaleDateString('ar-IQ') : 'غير محدد'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">بدون اشتراك</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('ar-IQ')}
                      </TableCell>
                      <TableCell className="text-left">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" />}>
                            <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>خيارات التحكم</DropdownMenuLabel>
                            <DropdownMenuItem render={<Link href={`/users/${u.id}`} className="cursor-pointer" />}>
                              <Eye className="ml-2 h-4 w-4 text-indigo-600" /> عرض التفاصيل
                            </DropdownMenuItem>
                            {u.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate({ userId: u.id, newStatus: 'inactive' })}
                                className="text-rose-600 cursor-pointer"
                              >
                                <UserX className="ml-2 h-4 w-4" /> إيقاف الحساب
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate({ userId: u.id, newStatus: 'active' })}
                                className="text-emerald-600 cursor-pointer"
                              >
                                <UserCheck className="ml-2 h-4 w-4" /> إغلاق الإيقاف وتفعيل
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-xs text-muted-foreground">
              عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, data?.count || 0)} من إجمالي {data?.count || 0} مستخدم
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
