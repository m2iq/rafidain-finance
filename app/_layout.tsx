import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAppStore } from '../src/core/store/appStore';
import { lightTheme, darkTheme } from '../src/shared/theme/theme';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { initializeDatabase } from '../src/core/database/db';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    try {
      initializeDatabase();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }, []);

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
