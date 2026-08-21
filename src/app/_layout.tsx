import { Component, ErrorInfo, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, I18nManager } from 'react-native';
import { Stack, router } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import Constants from 'expo-constants';

LogBox.ignoreLogs([
  'Method getContentUriAsync imported from "expo-file-system" is deprecated',
  'Method getInfoAsync imported from "expo-file-system" is deprecated',
]);
import { lightTheme, darkTheme } from '../shared/theme/theme';
import { initializeDatabase } from '../core/database/db';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { useAppStore } from '../core/store/appStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UpdateModal from '../shared/components/UpdateModal';

SplashScreen.preventAutoHideAsync();

class GlobalErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  state: { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null } = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ hasError: true, error, errorInfo });
    console.error('CRITICAL JS ERROR:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', padding: 24, justifyContent: 'center' }}>
          <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            حدث خطأ غير متوقع في تشغيل التطبيق
          </Text>
          <Text style={{ color: '#F87171', fontSize: 14, marginBottom: 16 }}>
            {this.state.error?.toString()}
          </Text>
          <ScrollView style={{ maxHeight: 250, backgroundColor: '#1E293B', padding: 12, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>
              {this.state.errorInfo?.componentStack}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={{ backgroundColor: '#4F46E5', padding: 14, borderRadius: 12, alignItems: 'center' }}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    let subscription: any = null;
    
    // In Expo SDK 53+, remote notifications crash Expo Go. 
    // We check if we are in Expo Go before requiring it.
    if (Constants.executionEnvironment !== 'storeClient' && Constants.appOwnership !== 'expo') {
      try {
        const Notifications = require('expo-notifications');
        subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          if (data?.url === 'support-chat' || data?.type === 'support') {
            setTimeout(() => {
              router.push('/(main)/support-chat');
            }, 100);
          }
        });
      } catch (error) {
        console.warn('Notifications not supported in this environment');
      }
    } else {
      console.log('Running in Expo Go: Skipping remote push notifications setup.');
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="index" />
          </Stack>
          <UpdateModal />
        </PaperProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

