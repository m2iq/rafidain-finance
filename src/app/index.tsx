import { Redirect } from 'expo-router';
import { useAppStore } from '../core/store/appStore';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const theme = useTheme();

  // Wait for Zustand to rehydrate from AsyncStorage before deciding
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  // If user session exists, go directly to main app
  if (user) {
    return <Redirect href="/(main)" />;
  }

  // No session → go to login
  return <Redirect href="/(auth)/login" />;
}
