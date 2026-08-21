import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Surface, Text, useTheme, Dialog, Portal, Button as PaperButton } from 'react-native-paper';
import { Bell, BellOff, ChevronLeft, Clock, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationService } from '../../core/notifications/notificationService';
import AppScreen from '../../shared/components/AppScreen';

import { useAppStore } from '../../core/store/appStore';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);

  const loadNotifications = async () => {
    if (user?.id) {
      await NotificationService.fetchAndSyncSystemNotifications(user.id);
    }
    // Capture the real is_read snapshot before marking everything as read,
    // so the current screen render can still show which items were unread.
    const list = NotificationService.getLocalNotifications(user?.id);
    setNotifications(list);
    NotificationService.markAllAsRead();
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const handleNotificationPress = (item: any) => {
    if (item.type !== 'due_alert') return;
    router.push('/(main)/debts');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    NotificationService.deleteAllLocalNotifications();
    setNotifications([]);
    setConfirmClearVisible(false);
  };

  const headerRight = notifications.length > 0 ? (
    <TouchableOpacity onPress={() => setConfirmClearVisible(true)} style={{ padding: 8 }}>
      <Trash2 size={20} color={theme.colors.error} />
    </TouchableOpacity>
  ) : null;

  return (
    <AppScreen title="الإشعارات التنبيهية" headerRight={headerRight}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const isDue = item.type === 'due_alert';
          const isUnread = !item.is_read;
          const isPressable = isDue;
          const CardWrapper = isPressable ? TouchableOpacity : View;

          return (
            <Surface
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isUnread ? theme.colors.primary : theme.colors.outlineVariant,
                  borderWidth: isUnread ? 1.5 : 1,
                },
              ]}
              elevation={1}
            >
              <CardWrapper
                activeOpacity={0.7}
                onPress={isPressable ? () => handleNotificationPress(item) : undefined}
                style={styles.cardHeader}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDue
                        ? theme.dark
                          ? '#4C0519'
                          : '#FEE2E2'
                        : theme.colors.primaryContainer,
                    },
                  ]}
                >
                  <Bell
                    size={20}
                    color={isDue ? '#EF4444' : theme.colors.primary}
                  />
                  {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]} />}
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      variant="titleSmall"
                      style={{ color: theme.colors.onSurface, fontFamily: isUnread ? 'Cairo_700Bold' : 'Cairo_600SemiBold', flex: 1 }}
                    >
                      {item.title}
                    </Text>
                    {isPressable && <ChevronLeft size={16} color={theme.colors.outline} />}
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.outline, marginTop: 4, fontFamily: 'Cairo_400Regular' }}
                  >
                    {item.body}
                  </Text>
                  <View style={styles.timeRow}>
                    <Clock size={12} color={theme.colors.outline} />
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.outline, marginRight: 4 }}
                    >
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-IQ') : ''}
                    </Text>
                  </View>
                </View>
              </CardWrapper>
            </Surface>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BellOff size={48} color={theme.colors.outline} strokeWidth={1.5} />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.outline, fontFamily: 'Cairo_700Bold', marginTop: 12 }}
            >
              لا توجد إشعارات حالياً
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.outline, marginTop: 4, textAlign: 'center' }}
            >
              ستظهر هنا تنبيهات الديون والأقساط المستحقة ورسائل الإدارة فور صدورها.
            </Text>
          </View>
        }
      />
      
      <Portal>
        <Dialog visible={confirmClearVisible} onDismiss={() => setConfirmClearVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ fontFamily: 'Cairo_700Bold', color: theme.colors.error }}>مسح الإشعارات</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ fontFamily: 'Cairo_400Regular' }}>
              هل أنت متأكد من مسح جميع الإشعارات؟ لا يمكن التراجع عن هذا الإجراء.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setConfirmClearVisible(false)} labelStyle={{ fontFamily: 'Cairo_600SemiBold' }}>إلغاء</PaperButton>
            <PaperButton onPress={handleClearAll} textColor={theme.colors.error} labelStyle={{ fontFamily: 'Cairo_700Bold' }}>مسح الكل</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
