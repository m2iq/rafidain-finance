'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserX,
  Users as UsersIcon,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  FilterX,
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';

// ─── Helpers ─────────────────────────────────────────────────────
function UserAvatar({ name }: { name?: string | null }) {
  const initial = (name ?? '؟').charAt(0);
  const colors = [
    'from-indigo-500 to-violet-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-sky-500 to-blue-600',
  ];
  const idx = (initial.codePointAt(0) ?? 0) % colors.length;
  return (
    <div
      className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
    >
      {initial}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        isActive
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />
      {isActive ? 'نشط' : 'موقوف'}
    </span>
  );
}

function SubBadge({ sub }: { sub: any }) {
  if (!sub) {
    return (
      <span className="text-[11px] text-muted-foreground font-medium">
        بدون اشتراك
      </span>
    );
  }

  const isActive = sub.status === 'active';
  const tier = (sub.plan_tier ?? '').replace(/_/g, ' ');
  const endDate = sub.end_date
    ? new Date(sub.end_date).toLocaleDateString('ar-IQ')
    : null;

  return (
    <div className="space-y-0.5">
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
          isActive
            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
            : 'bg-muted text-muted-foreground border-border'
        }`}
      >
        {tier}
      </span>
      {endDate && (
        <p className="text-[10px] text-muted-foreground">
          {isActive ? 'ينتهي' : 'انتهى'}: {endDate}
        </p>
      )}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-3 w-20" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-lg ms-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function UsersPage() {
  const queryClient = useQueryClient();
  const { adminProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: kpis } = useQuery({
    queryKey: ['adminUsersKpis'],
    queryFn: async () => {
      const [totalRes, activeRes, subsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        suspended: (totalRes.count ?? 0) - (activeRes.count ?? 0),
        activeSubs: subsRes.count ?? 0,
      };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsersList', page, searchTerm, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('users')
        .select('*, subscriptions(*)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);

      if (searchTerm.trim()) {
        const raw = searchTerm.trim();
        const term = sanitizeIlikeTerm(raw);
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
        q = isUuid
          ? q.or(`id.eq.${raw},name.ilike.%${term}%,phone.ilike.%${term}%`)
          : q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { users: data, count };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      userId,
      newStatus,
    }: {
      userId: string;
      newStatus: string;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsersKpis'] });
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 1;
  const hasFilters = searchTerm || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* ─── Page header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          إدارة المستخدمين
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          البحث والفلترة والتحكم الكامل في حسابات أصحاب المتاجر
        </p>
      </div>

      {/* ─── KPIs ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={kpis?.total ?? 0}
          icon={UsersIcon}
          color="indigo"
        />
        <StatCard
          title="حسابات نشطة"
          value={kpis?.active ?? 0}
          icon={ShieldCheck}
          color="emerald"
          trend="up"
        />
        <StatCard
          title="حسابات موقوفة"
          value={kpis?.suspended ?? 0}
          icon={UserX}
          color="rose"
          trend="neutral"
        />
        <StatCard
          title="اشتراكات سحابية نشطة"
          value={kpis?.activeSubs ?? 0}
          icon={CreditCard}
          color="violet"
        />
      </div>

      {/* ─── Table card ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pr-9 h-9 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v) { setStatusFilter(v); setPage(1); }
              }}
            >
              <SelectTrigger className="h-9 w-44 rounded-xl text-sm">
                <SelectValue placeholder="حالة الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط فقط</SelectItem>
                <SelectItem value="inactive">موقوف فقط</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                <FilterX size={14} />
                إلغاء
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[220px]">المستخدم</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>حالة الحساب</TableHead>
                <TableHead>الاشتراك</TableHead>
                <TableHead>تاريخ الانضمام</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : data?.users?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                        <UsersIcon size={20} className="text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        لا يوجد مستخدمون
                      </p>
                      {hasFilters && (
                        <p className="text-xs text-muted-foreground/60">
                          جرّب تغيير معايير البحث أو الفلتر
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.users?.map((u: any) => {
                  const sub = Array.isArray(u.subscriptions)
                    ? (u.subscriptions.length > 0
                        ? [...u.subscriptions].sort(
                            (a: any, b: any) =>
                              new Date(b.created_at || b.end_date || 0).getTime() -
                              new Date(a.created_at || a.end_date || 0).getTime(),
                          )[0]
                        : null)
                    : (u.subscriptions && typeof u.subscriptions === 'object'
                        ? u.subscriptions
                        : null);

                  return (
                    <TableRow
                      key={u.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      {/* User column */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight truncate">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                              {u.id.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell dir="ltr" className="text-right font-medium text-sm text-muted-foreground">
                        {u.phone}
                      </TableCell>

                      <TableCell>
                        <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                          {u.role === 'owner' ? 'مالك' : u.role}
                        </span>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>

                      <TableCell>
                        <SubBadge sub={sub} />
                      </TableCell>

                      <TableCell className="text-[12px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('ar-IQ')}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          }>
                            <MoreHorizontal size={15} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                              خيارات التحكم
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              render={<Link href={`/users/${u.id}`} />}
                              className="gap-2 cursor-pointer"
                            >
                              <Eye size={14} className="text-indigo-500" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {u.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleMutation.mutate({
                                    userId: u.id,
                                    newStatus: 'inactive',
                                  })
                                }
                                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10"
                              >
                                <UserX size={14} />
                                إيقاف الحساب
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleMutation.mutate({
                                    userId: u.id,
                                    newStatus: 'active',
                                  })
                                }
                                className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-500/10"
                              >
                                <UserCheck size={14} />
                                تفعيل الحساب
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
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/10">
          <p className="text-[12px] text-muted-foreground">
            {data?.count
              ? `عرض ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.count)} من ${data.count.toLocaleString('ar-IQ')} مستخدم`
              : 'لا توجد نتائج'}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-8 rounded-lg text-xs gap-1"
            >
              <ChevronRight size={13} />
              السابق
            </Button>
            <span className="px-2 text-xs font-bold text-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="h-8 rounded-lg text-xs gap-1"
            >
              التالي
              <ChevronLeft size={13} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
