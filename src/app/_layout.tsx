import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../shared/theme/theme';
import { I18nManager } from 'react-native';
import { useEffect, useState } from 'react';
import { initializeDatabase } from '../core/database/db';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { useAppStore } from '../core/store/appStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
      },
    },
  }));

  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  useEffect(() => {
    try {
      initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="index" />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
