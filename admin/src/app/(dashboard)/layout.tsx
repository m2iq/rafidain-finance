'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useState } from 'react';
import { ShieldCheck, ChevronLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toast';

const ROUTE_META: Record<string, { label: string; emoji?: string }> = {
  '/': { label: 'الرئيسية' },
  '/users': { label: 'المستخدمون' },
  '/subscriptions': { label: 'الاشتراكات' },
  '/subscription-plans': { label: 'خطط الأسعار' },
  '/reports': { label: 'التقارير والتحليلات' },
  '/vouchers': { label: 'أكواد التفعيل' },
  '/notifications': { label: 'الإشعارات' },
  '/audit-logs': { label: 'سجل الإدارة' },
  '/settings': { label: 'إعدادات النظام' },
  '/updates': { label: 'إدارة التحديثات' },
  '/password-resets': { label: 'طلبات كلمة المرور' },
  '/support': { label: 'رسائل الدعم' },
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      <Link
        href="/"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="الرئيسية"
      >
        <Home size={14} />
      </Link>

      {segments.map((_, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const meta = ROUTE_META[path];
        const label = meta?.label ?? segments[idx];
        const isLast = idx === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1 min-w-0">
            <ChevronLeft
              size={12}
              className="shrink-0 text-muted-foreground/40 rotate-180"
            />
            {isLast ? (
              <span className="font-semibold text-foreground truncate">{label}</span>
            ) : (
              <Link
                href={path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ─── Page loading skeleton ────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-5 bg-background">
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
          <ShieldCheck size={26} className="text-white" />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />
      </div>
      <div className="space-y-2 text-center">
        <div className="h-3 w-36 rounded-full bg-muted animate-pulse mx-auto" />
        <div className="h-2.5 w-24 rounded-full bg-muted/60 animate-pulse mx-auto" />
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading, adminProfile } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && (!user || !isAdmin)) {
      router.replace('/login');
    }
  }, [mounted, loading, user, isAdmin, router]);

  if (!mounted || loading) return <LoadingScreen />;

  // Redirect in effect, not during render, to avoid "setState during render" warnings.
  if (!user || !isAdmin) return <LoadingScreen />;

  return (
    <SidebarProvider defaultOpen={true}>
      <Toaster />
      <AppSidebar />

      <main className="flex w-full flex-col h-screen overflow-hidden bg-background text-foreground">
        {/* ─── Top header ─────────────────────────────────────────── */}
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-card/60 backdrop-blur-md px-4 gap-4">
          {/* Left: trigger + breadcrumb */}
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg p-1.5 transition-all" />
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <Breadcrumbs />
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Admin badge */}
            {adminProfile?.name && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px]">
                <div className="h-5 w-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                  {adminProfile.name.charAt(0)}
                </div>
                <span className="font-semibold text-foreground leading-tight">
                  {adminProfile.name}
                </span>
              </div>
            )}

            <ThemeToggle />
          </div>
        </header>

        {/* ─── Page content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 md:p-7 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
