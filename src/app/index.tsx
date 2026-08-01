import { Redirect } from 'expo-router';
import { useAppStore } from '../core/store/appStore';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const theme = useTheme();

  // ننتظر حتى تكتمل استعادة بيانات التخزين قبل التوجيه
  // بدون هذا، سيرى المستخدم شاشة الدخول في كل مرة يفتح فيها التطبيق
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  // إذا كانت الجلسة موجودة، انتقل مباشرة للتطبيق
  if (user) {
    return <Redirect href="/(main)" />;
  }

  // لا توجد جلسة → شاشة تسجيل الدخول
  return <Redirect href="/(auth)/login" />;
}
