import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'manager' | 'cashier' | 'employee';
}

interface AppState {
  isCloudMode: boolean;
  isDarkMode: boolean;
  user: AppUser | null;
  _hasHydrated: boolean;
  hasActiveSubscription: boolean;
  isDatabaseReady: boolean;
  // Auth
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
  // Theme
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  // Cloud
  toggleCloudMode: () => void;
  setCloudMode: (isCloud: boolean) => void;
  // Subscription
  setSubscription: (isActive: boolean) => void;
  // Hydration
  setHasHydrated: (val: boolean) => void;
  // Database
  setDatabaseReady: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isCloudMode: false,
      isDarkMode: false,
      user: null,
      _hasHydrated: false,
      hasActiveSubscription: false,
      isDatabaseReady: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDarkMode) => set({ isDarkMode }),
      toggleCloudMode: () => set((state) => ({ isCloudMode: !state.isCloudMode })),
      setCloudMode: (isCloudMode) => set({ isCloudMode }),
      setSubscription: (hasActiveSubscription) => set({ hasActiveSubscription }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      setDatabaseReady: (val) => set({ isDatabaseReady: val }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // نستثني _hasHydrated من الحفظ لأنها قيمة runtime فقط
      partialize: (state) => ({
        isCloudMode: state.isCloudMode,
        isDarkMode: state.isDarkMode,
        user: state.user,
        hasActiveSubscription: state.hasActiveSubscription,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[STORE] Zustand hydration finished, state exists:', !!state);
        // يُستدعى عند اكتمال استعادة البيانات من التخزين
        if (state) {
          state.setHasHydrated(true);
          console.log('[STORE] Hydrated user:', state.user?.name);
        }
      },
    }
  )
);
