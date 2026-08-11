'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useState } from 'react';
import { ShieldCheck, Home, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const breadcrumbMap: Record<string, string> = {
  '/': 'الرئيسية',
  '/users': 'المستخدمون',
  '/subscriptions': 'الاشتراكات',
  '/subscription-plans': 'خطط الأسعار',
  '/vouchers': 'أكواد التفعيل',
  '/notifications': 'الإشعارات',
  '/audit-logs': 'سجل الإدارة',
  '/settings': 'الإعدادات',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <Home size={14} />
      </Link>
      {segments.map((_, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const label = breadcrumbMap[path] || segments[idx];
        const isLast = idx === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronLeft size={13} className="text-muted-foreground/50 rotate-180" />
            {isLast ? (
              <span className="font-semibold text-foreground">{label}</span>
            ) : (
              <Link href={path} className="text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg animate-pulse">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-3 w-32 bg-muted rounded-full animate-pulse mx-auto" />
          <div className="h-2.5 w-20 bg-muted/60 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    router.replace('/login');
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="w-full flex flex-col h-screen overflow-hidden bg-background text-foreground">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="w-px h-5 bg-border" />
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 md:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
