'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Ticket,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  SlidersHorizontal,
  KeyRound,
  BarChart3,
  Smartphone,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

// ─── Nav config ──────────────────────────────────────────────────
const MAIN_ITEMS = [
  { label: 'الرئيسية', href: '/', icon: LayoutDashboard },
  { label: 'المستخدمون', href: '/users', icon: Users },
  { label: 'الاشتراكات', href: '/subscriptions', icon: CreditCard },
  { label: 'خطط الأسعار', href: '/subscription-plans', icon: SlidersHorizontal },
  { label: 'التقارير', href: '/reports', icon: BarChart3 },
] as const;

const TOOLS_ITEMS = [
  { label: 'رسائل الدعم', href: '/support', icon: MessageSquare },
  { label: 'إدارة التحديثات', href: '/updates', icon: Smartphone },
  { label: 'طلبات كلمة المرور', href: '/password-resets', icon: KeyRound },
  { label: 'أكواد التفعيل', href: '/vouchers', icon: Ticket },
  { label: 'الإشعارات', href: '/notifications', icon: Bell },
  { label: 'سجل الإدارة', href: '/audit-logs', icon: ShieldCheck },
] as const;

const SETTINGS_ITEMS = [
  { label: 'إعدادات النظام', href: '/settings', icon: Settings },
] as const;

// ─── Section label ────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35 first:mt-0 select-none">
      {children}
    </p>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={href} />}
        isActive={active}
        className={`
          group flex h-9 items-center gap-3 rounded-xl px-3 py-0 text-sm font-medium
          transition-all duration-150 select-none
          ${
            active
              ? 'bg-primary/10 text-primary dark:bg-primary/15 shadow-sm font-semibold'
              : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
          }
        `}
      >
        <span
          className={`
            flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all
            ${
              active
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-sidebar-accent/60 text-sidebar-foreground/45 group-hover:text-sidebar-foreground group-hover:bg-sidebar-accent'
            }
          `}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
        <span className="flex-1 leading-tight">{label}</span>
        {active && (
          <ChevronLeft className="h-3 w-3 opacity-40 rotate-180" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname();
  const { adminProfile, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const initial = (adminProfile?.name ?? 'م').charAt(0);
  const roleBadge =
    adminProfile?.role === 'super_admin' ? 'رئيسي' : 'مشرف';

  return (
    <Sidebar side="right" className="border-l border-sidebar-border/50">
      {/* ─── Brand header ─────────────────────────────────────────── */}
      <SidebarHeader className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck size={19} className="text-white" strokeWidth={2.2} />
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-emerald-400 shadow-sm" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
              رافدين فاينانس
            </h2>
            <p className="mt-0.5 text-[11px] text-sidebar-foreground/45 font-medium">
              لوحة الإدارة المتكاملة
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-4 h-px bg-sidebar-border/60" />
      </SidebarHeader>

      {/* ─── Navigation ───────────────────────────────────────────── */}
      <SidebarContent className="px-2 pb-2">
        <SectionLabel>القائمة الرئيسية</SectionLabel>
        <SidebarMenu className="gap-0.5">
          {MAIN_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} label={item.label} active={isActive(item.href)} />
          ))}
        </SidebarMenu>

        <SectionLabel>الأدوات</SectionLabel>
        <SidebarMenu className="gap-0.5">
          {TOOLS_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} label={item.label} active={isActive(item.href)} />
          ))}
        </SidebarMenu>

        <SectionLabel>الإعدادات</SectionLabel>
        <SidebarMenu className="gap-0.5">
          {SETTINGS_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} label={item.label} active={isActive(item.href)} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* ─── Footer / User card ───────────────────────────────────── */}
      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-3 py-2.5 mb-2">
          {/* Avatar */}
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
              {adminProfile?.name ?? 'مدير النظام'}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/45 mt-0.5">
              {adminProfile?.email ?? ''}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500 dark:text-indigo-300 leading-tight">
            {roleBadge}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent py-2 px-3 text-[13px] font-semibold text-rose-500 dark:text-rose-400 transition-all duration-150 hover:border-rose-500/20 hover:bg-rose-500/8"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
