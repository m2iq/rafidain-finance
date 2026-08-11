import { Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useAppStore } from "../../core/store/appStore";
import { checkLiveSubscription } from "../../core/supabase/syncService";
import FloatingTabBar from "../../shared/components/FloatingTabBar";

export default function MainLayout() {
  console.log("[MAIN_LAYOUT] Component mounted");
  const theme = useTheme();
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    console.log(
      "[MAIN_LAYOUT] useEffect for subscription check, user.id:",
      user?.id,
    );
    if (user?.id) {
      checkLiveSubscription(user.id);
    }
  }, [user?.id]);

  const isDatabaseReady = useAppStore((s) => s.isDatabaseReady);
  const hasHydrated = useAppStore((s) => s._hasHydrated);

  if (!hasHydrated || !isDatabaseReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
        <Tabs.Screen name="customers" options={{ title: "العملاء" }} />
        <Tabs.Screen name="debts" options={{ title: "الديون" }} />
        <Tabs.Screen name="settings" options={{ title: "الإعدادات" }} />
        <Tabs.Screen
          name="subscription"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>
    </>
  );
}
