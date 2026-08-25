import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, ActivityIndicator, StatusBar, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useAppStore } from "../../core/store/appStore";
import { checkLiveSubscription, triggerBackgroundSync, startPeriodicSync, stopPeriodicSync, runSync } from "../../core/supabase/syncService";
import { NotificationService } from "../../core/notifications/notificationService";
import FloatingTabBar from "../../shared/components/FloatingTabBar";

export default function MainLayout() {
  const theme = useTheme();
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;

    checkLiveSubscription(user.id);
    NotificationService.init(user.id).then(() => {
      NotificationService.fetchAndSyncSystemNotifications(user.id!);
      NotificationService.checkAndScheduleDueNotifications(user.id!);
    });

    // Initial sync on mount
    triggerBackgroundSync(user.id);

    // Start periodic sync every 5 minutes
    startPeriodicSync();

    // Fetch system notifications every 60 seconds
    const notifIntervalId = setInterval(() => {
      if (user?.id) {
        NotificationService.fetchAndSyncSystemNotifications(user.id);
      }
    }, 60000);

    // Full sync when app returns from background to foreground
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && user?.id) {
        runSync(user.id).catch(() => {});
        NotificationService.fetchAndSyncSystemNotifications(user.id);
      }
    });

    return () => {
      stopPeriodicSync();
      clearInterval(notifIntervalId);
      appStateSub.remove();
    };
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
        <Tabs.Screen name="debts" options={{ title: "الديون والأقساط" }} />
        <Tabs.Screen name="settings" options={{ title: "الإعدادات" }} />
        <Tabs.Screen
          name="subscription"
          options={{ href: null, headerShown: false, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="change-password"
          options={{ href: null, headerShown: false, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="help-center"
          options={{ href: null, headerShown: false, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ href: null, headerShown: false, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="reports"
          options={{ href: null, headerShown: false, tabBarItemStyle: { display: 'none' } }}
        />
      </Tabs>
    </>
  );
}
