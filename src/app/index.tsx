import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '../core/store/appStore';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const setHasHydrated = useAppStore((s) => s.setHasHydrated);
  const theme = useTheme();

  useEffect(() => {
    console.log('[INDEX] useEffect mounted, hasHydrated:', hasHydrated);
    // مؤقت أمان لضمان عدم بقاء التطبيق معلقاً على الشاشة في حال تأخر الاستجابة
    const timer = setTimeout(() => {
      console.log('[INDEX] Hydration safety timeout triggered, hasHydrated:', hasHydrated);
      if (!hasHydrated) {
        setHasHydrated(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [hasHydrated, setHasHydrated]);

  const isDatabaseReady = useAppStore((s) => s.isDatabaseReady);

  // ننتظر حتى تكتمل استعادة بيانات التخزين وتهيئة قاعدة البيانات قبل التوجيه
  if (!hasHydrated || !isDatabaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  // إذا كانت الجلسة موجودة، انتقل مباشرة للتطبيق
  if (user) {
    console.log('[INDEX] Redirecting to /(main)');
    return <Redirect href="/(main)" />;
  }

  // لا توجد جلسة → شاشة تسجيل الدخول
  console.log('[INDEX] Redirecting to /(auth)/login');
  return <Redirect href="/(auth)/login" />;
}
