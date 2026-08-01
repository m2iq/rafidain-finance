import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import FloatingTabBar from '../../shared/components/FloatingTabBar';
import { StatusBar } from 'react-native';

export default function MainLayout() {
  const theme = useTheme();

  return (
    <>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Tabs.Screen name="index"        options={{ title: 'الرئيسية' }} />
        <Tabs.Screen name="customers"    options={{ title: 'العملاء' }} />
        <Tabs.Screen name="debts"        options={{ title: 'الديون' }} />
        <Tabs.Screen name="settings"     options={{ title: 'الإعدادات' }} />
        <Tabs.Screen name="subscription" options={{ href: null, headerShown: false }} />
      </Tabs>
    </>
  );
}
