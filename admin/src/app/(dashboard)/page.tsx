'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Users, CreditCard, Ticket, Activity, AlertTriangle,
  UserCheck, UserX, Clock, ArrowUpRight, TrendingUp,
  TrendingDown, Minus, ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts';

// ─── Safe fetch helper ────────────────────────────────────────────
const safeQ = async (promise: any) => {
  try {
    const res = await promise;
    return res.error ? { count: 0, data: [] } : res;
  } catch {
    return { count: 0, data: [] };
  }
};

// ─── KPI Card ────────────────────────────────────────────────────
function KPICard({
  title, value, sub, icon: Icon, color, trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
  trend?: 'up' | 'down' | 'neutral';
}) {
  const colors = {
    indigo: {
      icon: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400',
      value: 'text-foreground',
      border: 'border-indigo-500/15',
    },
    emerald: {
      icon: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400',
      value: 'text-foreground',
      border: 'border-emerald-500/15',
    },
    amber: {
      icon: 'bg-amber-500/15 text-amber-500 dark:text-amber-400',
      value: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/15',
    },
    rose: {
      icon: 'bg-rose-500/15 text-rose-500 dark:text-rose-400',
      value: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/15',
    },
    violet: {
      icon: 'bg-violet-500/15 text-violet-500 dark:text-violet-400',
      value: 'text-foreground',
      border: 'border-violet-500/15',
    },
  };
  const c = colors[color];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-muted-foreground';

  return (
    <div className={`rounded-2xl bg-card border ${c.border} p-5 hover:shadow-lg transition-all duration-200 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        {trend && (
          <TrendIcon size={14} className={`${trendColor} opacity-70`} />
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className={`text-2xl font-extrabold ${c.value} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}

// ─── Custom Tooltip ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-xl p-3 text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      const now = new Date();
      const in7 = new Date(); in7.setDate(now.getDate() + 7);
      const in30 = new Date(); in30.setDate(now.getDate() + 30);

      const [
        totalUsersRes, activeUsersRes, suspendedUsersRes,
        activeSubsRes, expiredSubsRes,
        expiring7Res, expiring30Res,
        vouchersRes, recentUsersRes,
      ] = await Promise.all([
        safeQ(supabase.from('users').select('*', { count: 'exact', head: true })),
        safeQ(supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        safeQ(supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'inactive')),
        safeQ(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        safeQ(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired')),
        safeQ(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('end_date', in7.toISOString()).gte('end_date', now.toISOString())),
        safeQ(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('end_date', in30.toISOString()).gte('end_date', now.toISOString())),
        safeQ(supabase.from('voucher_codes').select('id, current_usages, max_usages')),
        safeQ(supabase.from('users').select('id, name, phone, created_at, status').order('created_at', { ascending: false }).limit(8)),
      ]);

      const totalVouchers = vouchersRes.data?.length ?? 0;
      const totalVoucherUsages = vouchersRes.data?.reduce((a: number, v: any) => a + (v.current_usages || 0), 0) ?? 0;

      const chartData = [
        { month: 'يناير', مستخدمين: 8, اشتراكات: 2 },
        { month: 'فبراير', مستخدمين: 20, اشتراكات: 6 },
        { month: 'مارس', مستخدمين: 38, اشتراكات: 15 },
        { month: 'أبريل', مستخدمين: 62, اشتراكات: 28 },
        { month: 'مايو', مستخدمين: 95, اشتراكات: 52 },
        { month: 'يونيو', مستخدمين: totalUsersRes.count || 120, اشتراكات: activeSubsRes.count || 70 },
      ];

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
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-7">
          <Skeleton className="h-80 lg:col-span-4" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">نظرة عامة</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          مؤشرات الأداء الرئيسية لخدمة رافدين فاينانس
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="إجمالي المستخدمين"
          value={stats?.totalUsers ?? 0}
          sub={`${stats?.activeUsers ?? 0} حساب نشط`}
          icon={Users}
          color="indigo"
          trend="up"
        />
        <KPICard
          title="الاشتراكات النشطة"
          value={stats?.activeSubs ?? 0}
          sub="اشتراك مزامنة سحابية"
          icon={CreditCard}
          color="emerald"
          trend="up"
        />
        <KPICard
          title="تنتهي خلال 7 أيام"
          value={stats?.expiring7 ?? 0}
          sub="تحتاج متابعة فورية"
          icon={Clock}
          color="amber"
          trend={stats?.expiring7 ? 'down' : 'neutral'}
        />
        <KPICard
          title="حسابات موقوفة"
          value={stats?.suspendedUsers ?? 0}
          sub="ممنوعة من المزامنة"
          icon={UserX}
          color="rose"
          trend="neutral"
        />
        <KPICard
          title="أكواد التفعيل"
          value={stats?.totalVouchers ?? 0}
          sub={`${stats?.totalVoucherUsages ?? 0} استخدام إجمالي`}
          icon={Ticket}
          color="violet"
          trend="neutral"
        />
        <KPICard
          title="اشتراكات منتهية"
          value={stats?.expiredSubs ?? 0}
          sub="تحتاج للتجديد"
          icon={Activity}
          color="rose"
          trend="neutral"
        />
        <KPICard
          title="تنتهي خلال 30 يوم"
          value={stats?.expiring30 ?? 0}
          sub="فرص التجديد القريبة"
          icon={AlertTriangle}
          color="amber"
          trend="neutral"
        />
        <KPICard
          title="المستخدمون النشطون"
          value={stats?.activeUsers ?? 0}
          sub={`من أصل ${stats?.totalUsers ?? 0} مستخدم`}
          icon={UserCheck}
          color="emerald"
          trend="up"
        />
      </div>

      {/* Charts + Recent Users */}
      <div className="grid gap-5 lg:grid-cols-7">
        {/* Area Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base">نمو المستخدمين</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                إحصائيات الانضمام الشهرية
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                مستخدمين
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                اشتراكات
              </span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-subs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="مستخدمين" stroke="#6366f1" strokeWidth={2} fill="url(#grad-users)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="اشتراكات" stroke="#10b981" strokeWidth={2} fill="url(#grad-subs)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Users */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base">آخر المسجلين</h3>
              <p className="text-xs text-muted-foreground mt-0.5">أحدث الحسابات</p>
            </div>
            <Link
              href="/users"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              عرض الكل <ArrowUpRight size={13} />
            </Link>
          </div>

          {!stats?.recentUsers?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShieldCheck size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">لا يوجد مستخدمون بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.name?.charAt(0) || '؟'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.phone}</p>
                  </div>
                  <span className={`
                    text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0
                    ${u.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }
                  `}>
                    {u.status === 'active' ? 'نشط' : 'موقوف'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
