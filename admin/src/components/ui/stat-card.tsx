'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type StatCardColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';

const COLORS: Record<
  StatCardColor,
  { gradient: string; icon: string; shadow: string }
> = {
  indigo: {
    gradient: 'from-indigo-500 via-indigo-500 to-violet-500',
    icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20',
    shadow: 'hover:shadow-indigo-500/8',
  },
  emerald: {
    gradient: 'from-emerald-500 via-emerald-400 to-teal-500',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20',
    shadow: 'hover:shadow-emerald-500/8',
  },
  amber: {
    gradient: 'from-amber-500 via-amber-400 to-orange-500',
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20',
    shadow: 'hover:shadow-amber-500/8',
  },
  rose: {
    gradient: 'from-rose-500 via-rose-400 to-pink-500',
    icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20',
    shadow: 'hover:shadow-rose-500/8',
  },
  violet: {
    gradient: 'from-violet-500 via-violet-400 to-purple-600',
    icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20',
    shadow: 'hover:shadow-violet-500/8',
  },
};

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: StatCardColor;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const c = COLORS[color];

  const formatted =
    typeof value === 'number' ? value.toLocaleString('ar-IQ') : value;

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendCls =
    trend === 'up'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : 'bg-muted text-muted-foreground';

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl bg-card border border-border
        hover:shadow-lg ${c.shadow} hover:-translate-y-0.5
        transition-all duration-200 cursor-default
      `}
    >
      {/* gradient stripe */}
      <div
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${c.gradient}`}
      />

      <div className="p-5 pt-[22px]">
        {/* icon row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${c.icon}`}
          >
            <Icon size={20} strokeWidth={1.8} />
          </div>

          {trend && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${trendCls}`}
            >
              <TrendIcon size={11} />
            </span>
          )}
        </div>

        {/* label */}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>

        {/* number */}
        <p className="text-[2rem] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
          {formatted}
        </p>

        {/* sub */}
        {sub && (
          <p className="mt-2 text-[11px] font-medium text-muted-foreground line-clamp-1">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
