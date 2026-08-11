'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ShieldCheck, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // إعادة التوجيه داخل useEffect لتفادي خطأ "update during render"
  useEffect(() => {
    if (user && isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, router]);

  if (user && isAdmin) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error('بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور');
      }

      if (!data.user) throw new Error('فشل تسجيل الدخول');

      // التحقق من صلاحيات الإدارة باستخدام maybeSingle لتفادي خطأ 406
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error('عفواً، لا تملك صلاحية الوصول إلى لوحة تحكم الإدارة.');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ديون واقساط الرافدين
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            لوحة الإدارة المتكاملة للنظام
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@rafidain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-zinc-600 text-sm outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-zinc-600 text-sm outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  دخول لوحة التحكم
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          © {new Date().getFullYear()} Rafidain Finance — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
