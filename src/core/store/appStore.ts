import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const zustandStorage = {
  setItem: async (name: string, value: string) => {
    return await AsyncStorage.setItem(name, value);
  },
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  removeItem: async (name: string) => {
    return await AsyncStorage.removeItem(name);
  },
};

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isCloudMode: false,
      isDarkMode: false,
      user: null,
      _hasHydrated: false,
      hasActiveSubscription: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDarkMode) => set({ isDarkMode }),
      toggleCloudMode: () => set((state) => ({ isCloudMode: !state.isCloudMode })),
      setCloudMode: (isCloudMode) => set({ isCloudMode }),
      setSubscription: (hasActiveSubscription) => set({ hasActiveSubscription }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
