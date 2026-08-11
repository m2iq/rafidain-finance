'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
}

interface AuthContextType {
  user: User | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminProfile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAdminProfile(null);
    setIsAdmin(false);
    router.push('/login');
  };

  const checkAdminPrivileges = async (currentUser: User) => {
    try {
      // استخدام maybeSingle() بدلاً من single() لتفادي خطأ 406
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, name, role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setAdminProfile(data as AdminProfile);
        setIsAdmin(true);
        return true;
      } else {
        // ليس أدمن — تسجيل خروج فوري
        await supabase.auth.signOut();
        setUser(null);
        setAdminProfile(null);
        setIsAdmin(false);
        return false;
      }
    } catch {
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await checkAdminPrivileges(currentUser);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await checkAdminPrivileges(currentUser);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      if ((!user || !isAdmin) && pathname !== '/login') {
        router.push('/login');
      } else if (user && isAdmin && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, isAdmin, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, adminProfile, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
