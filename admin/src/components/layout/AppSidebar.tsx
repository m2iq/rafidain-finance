'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
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
  Zap,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

const mainNavItems = [
  { title: 'الرئيسية', url: '/', icon: LayoutDashboard },
  { title: 'المستخدمون', url: '/users', icon: Users },
  { title: 'الاشتراكات', url: '/subscriptions', icon: CreditCard },
  { title: 'خطط الأسعار', url: '/subscription-plans', icon: SlidersHorizontal },
];

const toolsNavItems = [
  { title: 'أكواد التفعيل', url: '/vouchers', icon: Ticket },
  { title: 'إرسال إشعار', url: '/notifications', icon: Bell },
  { title: 'سجل الإدارة', url: '/audit-logs', icon: ShieldCheck },
];

const settingsNavItems = [
  { title: 'إعدادات النظام', url: '/settings', icon: Settings },
];

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof mainNavItems;
  pathname: string;
}) {
  return (
    <SidebarGroup className="mb-1">
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1 text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url !== '/' && pathname.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={isActive}
                  className={`
                    py-2.5 px-3 rounded-xl transition-all duration-150 flex items-center gap-3 group
                    ${isActive
                      ? 'bg-gradient-to-l from-indigo-600/20 to-violet-600/10 text-indigo-400 dark:text-indigo-300 font-semibold shadow-sm'
                      : 'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    }
                  `}
                >
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center transition-all
                    ${isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-sidebar-accent text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                    }
                  `}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-sm flex-1">{item.title}</span>
                  {isActive && (
                    <ChevronRight className="h-3 w-3 opacity-60" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { adminProfile, logout } = useAuth();

  const initials = adminProfile?.name
    ? adminProfile.name.charAt(0)
    : 'م';

  return (
    <Sidebar side="right" className="border-l-0">
      {/* Logo Header */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Zap size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm leading-tight truncate">ديون واقساط الرافدين</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] text-muted-foreground">متصل بالخوادم</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3">
        <NavSection label="القائمة الرئيسية" items={mainNavItems} pathname={pathname} />
        <NavSection label="الأدوات" items={toolsNavItems} pathname={pathname} />
        <NavSection label="الإعدادات" items={settingsNavItems} pathname={pathname} />
      </SidebarContent>

      {/* Footer - User Info */}
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sidebar-accent/60 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{adminProfile?.name || 'مدير النظام'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{adminProfile?.email || ''}</p>
          </div>
          <span className="text-[10px] bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full shrink-0 border border-indigo-500/20">
            {adminProfile?.role === 'super_admin' ? 'رئيسي' : 'أدمن'}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
