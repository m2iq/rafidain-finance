'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Ticket,
  Activity,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { StatCard } from '@/components/ui/stat-card';

// ─── Helpers ─────────────────────────────────────────────────────
const safeQ = async (promise: any) => {
  try {
    const res = await promise;
    return res.error
      ? { count: 0, data: [], failed: true }
      : { ...res, failed: false };
  } catch {
    return { count: 0, data: [], failed: true };
  }
};

function PageSkeleton() {
  const Card = ({ h, cls = '' }: { h: string; cls?: string }) => (
    <div className={`rounded-2xl bg-muted/50 animate-pulse ${h} ${cls}`} />
  );
  return (
    <div className="space-y-6">
      <Card h="h-20" cls="max-w-sm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} h="h-[108px]" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-7">
        <Card h="h-[300px]" cls="lg:col-span-4" />
        <Card h="h-[300px]" cls="lg:col-span-3" />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-xl p-3 text-sm min-w-[140px]">
      <p className="font-semibold mb-2 text-foreground text-xs">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: p.stroke }}
            />
            {p.name}
          </span>
          <span className="font-bold text-foreground text-[13px]">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { adminProfile } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminDashboardStats'],
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date();
      const in7 = new Date(now);
      in7.setDate(now.getDate() + 7);
      const in30 = new Date(now);
      in30.setDate(now.getDate() + 30);

      const monthStarts = Array.from({ length: 6 }).map((_, i) => {
        return new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      });
      const windowStart = monthStarts[0];

      const [
        totalUsersRes,
        activeUsersRes,
        suspendedUsersRes,
        activeSubsRes,
        expiredSubsRes,
        expiring7Res,
        expiring30Res,
        vouchersRes,
        recentUsersRes,
        usersGrowthRes,
        subsGrowthRes,
      ] = await Promise.all([
        safeQ(supabase.from('users').select('*', { count: 'exact', head: true })),
        safeQ(
          supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ),
        safeQ(
          supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'inactive'),
        ),
        safeQ(
          supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ),
        safeQ(
          supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'expired'),
        ),
        safeQ(
          supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lte('end_date', in7.toISOString())
            .gte('end_date', now.toISOString()),
        ),
        safeQ(
          supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lte('end_date', in30.toISOString())
            .gte('end_date', now.toISOString()),
        ),
        safeQ(supabase.from('voucher_codes').select('id, current_usages, max_usages')),
        safeQ(
          supabase
            .from('users')
            .select('id, name, phone, created_at, status')
            .order('created_at', { ascending: false })
            .limit(8),
        ),
        safeQ(
          supabase
            .from('users')
            .select('created_at')
            .gte('created_at', windowStart.toISOString()),
        ),
        safeQ(
          supabase
            .from('subscriptions')
            .select('created_at')
            .gte('created_at', windowStart.toISOString()),
        ),
      ]);

      const totalVouchers = vouchersRes.data?.length ?? 0;
      const totalVoucherUsages =
        vouchersRes.data?.reduce(
          (a: number, v: any) => a + (v.current_usages || 0),
          0,
        ) ?? 0;

      const monthFmt = new Intl.DateTimeFormat('ar', { month: 'short' });
      const bucketByMonth = (
        rows: { created_at: string }[],
        start: Date,
      ) => {
        const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return rows.filter((r) => {
          const t = new Date(r.created_at);
          return t >= start && t < next;
        }).length;
      };

      const chartData = monthStarts.map((ms) => ({
        month: monthFmt.format(ms),
        مستخدمون: bucketByMonth(usersGrowthRes.data ?? [], ms),
        اشتراكات: bucketByMonth(subsGrowthRes.data ?? [], ms),
      }));

      const hasErrors = [
        totalUsersRes, activeUsersRes, suspendedUsersRes,
        activeSubsRes, expiredSubsRes, expiring7Res, expiring30Res,
        vouchersRes, recentUsersRes, usersGrowthRes, subsGrowthRes,
      ].some((r) => r.failed);

      return {
        totalUsers: totalUsersRes.count ?? 0,
        activeUsers: activeUsersRes.count ?? 0,
        suspendedUsers: suspendedUsersRes.count ?? 0,
        activeSubs: activeSubsRes.count ?? 0,
        expiredSubs: expiredSubsRes.count ?? 0,
        expiring7: expiring7Res.count ?? 0,
        expiring30: expiring30Res.count ?? 0,
        totalVouchers,
        totalVoucherUsages,
        recentUsers: recentUsersRes.data ?? [],
        chartData,
        hasErrors,
      };
    },
  });

  if (isLoading) return <PageSkeleton />;

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';

  return (
    <div className="space-y-7">
      {/* ─── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-0.5">
            {greeting}،{' '}
            <span className="text-foreground font-semibold">
              {adminProfile?.name ?? 'مدير النظام'}
            </span>
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
            نظرة عامة على النظام
          </h1>
        </div>

        <div className="text-[11px] text-muted-foreground font-medium">
          {new Intl.DateTimeFormat('ar-IQ', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date())}
        </div>
      </div>

      {/* Error banner */}
      {stats?.hasErrors && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14} className="shrink-0" />
          تعذر تحميل بعض البيانات — الأرقام المعروضة قد تكون غير مكتملة
        </div>
      )}

      {/* ─── KPI Grid ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats?.totalUsers ?? 0}
          sub={`${stats?.activeUsers ?? 0} حساب نشط`}
          icon={Users}
          color="indigo"
          trend="up"
        />
        <StatCard
          title="الاشتراكات النشطة"
          value={stats?.activeSubs ?? 0}
          sub="اشتراك مزامنة سحابية"
          icon={CreditCard}
          color="emerald"
          trend="up"
        />
        <StatCard
          title="تنتهي خلال 7 أيام"
          value={stats?.expiring7 ?? 0}
          sub="تحتاج متابعة فورية"
          icon={Clock}
          color="amber"
          trend={stats?.expiring7 ? 'down' : 'neutral'}
        />
        <StatCard
          title="حسابات موقوفة"
          value={stats?.suspendedUsers ?? 0}
          sub="ممنوعة من المزامنة"
          icon={UserX}
          color="rose"
          trend="neutral"
        />
        <StatCard
          title="أكواد التفعيل"
          value={stats?.totalVouchers ?? 0}
          sub={`${stats?.totalVoucherUsages ?? 0} استخدام إجمالي`}
          icon={Ticket}
          color="violet"
          trend="neutral"
        />
        <StatCard
          title="اشتراكات منتهية"
          value={stats?.expiredSubs ?? 0}
          sub="تحتاج للتجديد"
          icon={Activity}
          color="rose"
          trend="neutral"
        />
        <StatCard
          title="تنتهي خلال 30 يوم"
          value={stats?.expiring30 ?? 0}
          sub="فرص التجديد القريبة"
          icon={AlertTriangle}
          color="amber"
          trend="neutral"
        />
        <StatCard
          title="المستخدمون النشطون"
          value={stats?.activeUsers ?? 0}
          sub={`من أصل ${stats?.totalUsers ?? 0} مستخدم`}
          icon={UserCheck}
          color="emerald"
          trend="up"
        />
      </div>

      {/* ─── Chart + Recent users ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-7">
        {/* Area Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <TrendingUp size={17} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">نمو المستخدمين</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  إحصائيات الانضمام الشهرية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                مستخدمون
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                اشتراكات
              </span>
            </div>
          </div>

          {/* Chart area */}
          <div className="px-4 pb-5 pt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.chartData}
                margin={{ top: 4, right: 2, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="مستخدمون"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gu)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="اشتراكات"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gs)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent users */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">آخر المسجلين</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  أحدث الحسابات في النظام
                </p>
              </div>
            </div>
            <Link
              href="/users"
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline underline-offset-2 shrink-0"
            >
              عرض الكل
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="p-3">
            {!stats?.recentUsers?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <ShieldCheck size={22} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  لا يوجد مستخدمون بعد
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentUsers.map((u: any) => (
                  <Link
                    key={u.id}
                    href={`/users/${u.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {(u.name ?? '؟').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate text-foreground leading-tight">
                        {u.name}
                      </p>
                      <p
                        className="text-[11px] text-muted-foreground truncate"
                        dir="ltr"
                      >
                        {u.phone}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {u.status === 'active' ? 'نشط' : 'موقوف'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
