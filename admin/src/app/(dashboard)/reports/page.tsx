'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatIQD } from '@/lib/format';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Wallet, Users, PiggyBank, Info } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

const safeQ = async (promise: any) => {
  try {
    const res = await promise;
    return res.error ? { count: 0, data: [] } : res;
  } catch {
    return { count: 0, data: [] };
  }
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-xl p-3 text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke || p.payload?.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">
            {typeof p.value === 'number' ? p.value.toLocaleString('ar-IQ') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function ReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => {
      const now = new Date();
      const monthStarts = Array.from({ length: 6 }).map(
        (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1),
      );
      const windowStart = monthStarts[0];

      const [
        plansRes, historyRes, activeSubsRes, debtsRes, customersCountRes, storesCountRes,
      ] = await Promise.all([
        safeQ(supabase.from('subscription_plans').select('tier_key, name, price')),
        safeQ(
          supabase
            .from('subscription_history')
            .select('plan_tier, action, created_at')
            .in('action', ['activated', 'extended', 'renewed'])
            .gte('created_at', windowStart.toISOString()),
        ),
        safeQ(supabase.from('subscriptions').select('plan_tier').eq('status', 'active')),
        // Capped client-side aggregation — Supabase's JS client has no SUM()
        // without an RPC, so this approximates platform totals at scale
        // instead of transferring every debt row.
        safeQ(supabase.from('debts').select('total_amount, paid_amount').limit(10000)),
        safeQ(supabase.from('customers').select('*', { count: 'exact', head: true })),
        safeQ(supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active')),
      ]);

      const priceByTier: Record<string, number> = {};
      (plansRes.data || []).forEach((p: any) => { priceByTier[p.tier_key] = p.price || 0; });

      const monthFmt = new Intl.DateTimeFormat('ar', { month: 'long' });
      const revenueByMonth = monthStarts.map((monthStart) => {
        const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const revenue = (historyRes.data || [])
          .filter((h: any) => {
            const t = new Date(h.created_at);
            return t >= monthStart && t < nextMonth;
          })
          .reduce((acc: number, h: any) => acc + (priceByTier[h.plan_tier] || 0), 0);
        return { month: monthFmt.format(monthStart), 'الإيرادات التقديرية': revenue };
      });

      const tierCounts: Record<string, number> = {};
      (activeSubsRes.data || []).forEach((s: any) => {
        const key = s.plan_tier || 'free';
        tierCounts[key] = (tierCounts[key] || 0) + 1;
      });
      const nameByTier: Record<string, string> = {};
      (plansRes.data || []).forEach((p: any) => { nameByTier[p.tier_key] = p.name; });
      const tierBreakdown = Object.entries(tierCounts).map(([tier, count]) => ({
        name: nameByTier[tier] || (tier === 'free' ? 'مجاني' : tier),
        value: count,
      }));

      const debtRows = debtsRes.data || [];
      const totalDebtAmount = debtRows.reduce((acc: number, d: any) => acc + (d.total_amount || 0), 0);
      const totalCollectedAmount = debtRows.reduce((acc: number, d: any) => acc + (d.paid_amount || 0), 0);

      const totalEstimatedRevenue = revenueByMonth.reduce((acc, m) => acc + m['الإيرادات التقديرية'], 0);

      return {
        revenueByMonth,
        tierBreakdown,
        totalDebtAmount,
        totalCollectedAmount,
        totalEstimatedRevenue,
        activeStores: storesCountRes.count ?? 0,
        totalCustomers: customersCountRes.count ?? 0,
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
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
      <div>
        <h1 className="text-xl font-bold tracking-tight">التقارير والتحليلات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          نظرة تحليلية على الإيرادات والاشتراكات والديون عبر جميع المتاجر
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="الإيرادات التقديرية (٦ أشهر)"
          value={formatIQD(stats?.totalEstimatedRevenue ?? 0)}
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="إجمالي الديون المسجلة"
          value={formatIQD(stats?.totalDebtAmount ?? 0)}
          icon={Wallet}
          color="amber"
        />
        <StatCard
          title="إجمالي المُحصّل من العملاء"
          value={formatIQD(stats?.totalCollectedAmount ?? 0)}
          icon={PiggyBank}
          color="emerald"
        />
        <StatCard
          title="إجمالي العملاء عبر كل المتاجر"
          value={(stats?.totalCustomers ?? 0).toLocaleString('ar-IQ')}
          icon={Users}
          color="violet"
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          الإيرادات محسوبة تقديرياً بضرب عدد عمليات تفعيل/تمديد الاشتراك بسعر الباقة الحالي، وليست مبالغ مدفوعات فعلية مسجلة.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-5">
            <h3 className="font-bold text-base">الإيرادات التقديرية الشهرية</h3>
            <p className="text-xs text-muted-foreground mt-0.5">آخر 6 أشهر</p>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueByMonth} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="الإيرادات التقديرية"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#grad-revenue)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
          <div className="mb-5">
            <h3 className="font-bold text-base">توزيع الاشتراكات النشطة</h3>
            <p className="text-xs text-muted-foreground mt-0.5">حسب نوع الباقة</p>
          </div>
          {!stats?.tierBreakdown?.length ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              لا توجد اشتراكات نشطة بعد
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tierBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {stats.tierBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {stats?.tierBreakdown?.map((t, i) => (
              <span key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {t.name} ({t.value})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
