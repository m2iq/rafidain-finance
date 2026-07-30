import { Redirect } from 'expo-router';
import { useAppStore } from '../src/core/store/appStore';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

export default function Index() {
  const user = useAppStore((state) => state.user);
  const theme = useTheme();
  
  // Basic routing: if user exists go to main, else auth.
  // For offline first, we might skip auth if local mode is on and no cloud subscription.
  // But for now, just redirect to auth.
  
  // TODO: Implement proper checking for local vs cloud mode and authentication.
  
  // Redirecting to (auth) by default as a starting point.
  return <Redirect href="/(auth)/login" />;
}
