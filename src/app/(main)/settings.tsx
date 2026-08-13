import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, CreditCard, Globe, HelpCircle, Lock, LogOut, Moon, Shield, User, X } from 'lucide-react-native';
import React from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Divider, Switch, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../core/store/appStore';
import { checkLiveSubscription, runSyncWithProgress, SyncProgress } from '../../core/supabase/syncService';
import { UserRepository } from '../../core/database/repositories/UserRepository';
import SyncProgressModal from '../../shared/components/SyncProgressModal';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';
import ar from '../../shared/i18n/ar';
import { NotificationService } from '../../core/notifications/notificationService';

function SettingRow({
  title, description, Icon, iconBg, iconColor, right, onPress, danger,
}: {
  title: string; description?: string;
  Icon: any; iconBg?: string; iconColor?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.colors.error : (iconColor ?? theme.colors.primary);
  const bg = danger ? theme.colors.errorContainer : (iconBg ?? theme.colors.primaryContainer);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <View style={styles.rowText}>
        <Text
          variant="titleSmall"
          style={{ color: danger ? theme.colors.error : theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description && (
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2, fontFamily: 'Cairo_400Regular' }}>
            {description}
          </Text>
        )}
      </View>
      {right ?? (
        onPress ? (
          <ChevronLeft size={18} color={theme.colors.outline} style={{ transform: [{ scaleX: -1 }] }} />
        ) : null
      )}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      {title && (
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.outline, marginBottom: 8, marginHorizontal: 4, fontFamily: 'Cairo_600SemiBold' }}
        >
          {title}
        </Text>
      )}
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const clearUser = useAppStore((s) => s.clearUser);
  const isCloudMode = useAppStore((s) => s.isCloudMode);
  const toggleCloud = useAppStore((s) => s.toggleCloudMode);
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDark = useAppStore((s) => s.toggleDarkMode);
  const hasActiveSubscription = useAppStore((s) => s.hasActiveSubscription);
  const setUser = useAppStore((s) => s.setUser);
  const notif = useAppStore((s) => s.notificationsEnabled);
  const setNotif = useAppStore((s) => s.setNotificationsEnabled);

  const handleToggleNotifications = async (val: boolean) => {
    setNotif(val);
    if (user?.id) {
      if (val) {
        await NotificationService.init(user.id);
      } else {
        await NotificationService.removePushTokenFromCloud(user.id);
      }
    }
  };

  const [syncModalVisible, setSyncModalVisible] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState<SyncProgress | null>(null);

  const [editProfileVisible, setEditProfileVisible] = React.useState(false);
  const [editName, setEditName] = React.useState(user?.name || '');
  const [editPhone, setEditPhone] = React.useState(user?.phone || '');
  const [editError, setEditError] = React.useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('يرجى تسجيل الدخول أولاً');
      await UserRepository.updateProfile(user.id, { name: editName, phone: editPhone });
    },
    onSuccess: () => {
      if (user) setUser({ ...user, name: editName.trim(), phone: editPhone.trim() });
      setEditProfileVisible(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.message || 'فشل تحديث البيانات');
    },
  });

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditError('');
    setEditProfileVisible(true);
  };

  React.useEffect(() => {
    if (user?.id) {
      checkLiveSubscription(user.id);
    }
  }, [user?.id]);

  const handleToggleCloud = async () => {
    if (!user?.id) return;
    const isLiveActive = await checkLiveSubscription(user.id);
    if (!isLiveActive) {
      Alert.alert(
        'ميزة مقفلة 🔒',
        'المزامنة السحابية متاحة فقط للمشتركين الذين لديهم باقة سحابية نشطة.\nهل تريد الاطلاع على خطط الاشتراك والأسعار؟',
        [
          { text: 'لا شكراً', style: 'cancel' },
          {
            text: 'عرض الخطط ←',
            onPress: () => router.push('/(main)/subscription'),
          },
        ]
      );
      return;
    }

    const nextCloudMode = !isCloudMode;
    toggleCloud();

    if (nextCloudMode) {
      setSyncModalVisible(true);
      runSyncWithProgress(user.id, (p) => {
        setSyncProgress(p);
      });
    }
  };

  const safeName = user?.name || ar.settings.storeOwner;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 90 + insets.bottom, paddingTop: Math.max(insets.top, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <Animated.View>
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Avatar.Text
            size={58}
            label={safeName.substring(0, 2)}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.primary}
          />
          <View style={styles.profileInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }} numberOfLines={1}>
              {safeName}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
              {user?.phone ?? '---'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
                {ar.settings.ownerBadge}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: theme.colors.outlineVariant }]}
            onPress={openEditProfile}
          >
            <User size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View>
        <Section title={ar.settings.general}>
          <SettingRow
            title={ar.settings.subscription}
            description={hasActiveSubscription ? "الباقة السحابية (الاحترافية)" : "الباقة المحلية (مجاني)"}
            Icon={CreditCard}
            iconBg={theme.colors.primaryContainer}
            iconColor={theme.colors.primary}
            onPress={() => router.push('/(main)/subscription')}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title={ar.settings.darkMode}
            Icon={Moon}
            iconBg={theme.colors.secondaryContainer}
            iconColor={theme.colors.secondary}
            right={<Switch value={isDarkMode} onValueChange={toggleDark} color={theme.colors.primary} />}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title={ar.settings.notifications}
            description={ar.settings.notificationsDesc}
            Icon={Bell}
            iconBg={theme.colors.tertiaryContainer}
            iconColor={theme.colors.tertiary}
            right={<Switch value={notif} onValueChange={handleToggleNotifications} color={theme.colors.primary} />}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={handleToggleCloud}
          >
            <View
              style={[
                styles.rowIcon,
                {
                  backgroundColor: hasActiveSubscription
                    ? (isCloudMode ? '#DCFCE7' : theme.colors.surfaceVariant)
                    : (theme.dark ? '#2D1B1B' : '#FEF2F2'),
                },
              ]}
            >
              {hasActiveSubscription ? (
                <Globe
                  size={18}
                  color={isCloudMode ? '#16A34A' : theme.colors.outline}
                  strokeWidth={2}
                />
              ) : (
                <Lock size={18} color={theme.colors.error} strokeWidth={2} />
              )}
            </View>

            <View style={styles.rowText}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}
              >
                {ar.settings.cloudSync}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: hasActiveSubscription ? theme.colors.outline : theme.colors.error,
                  marginTop: 2,
                  fontFamily: 'Cairo_400Regular',
                }}
              >
                {hasActiveSubscription
                  ? (isCloudMode ? ar.settings.cloudSyncActive : ar.settings.cloudSyncInactive)
                  : 'يتطلب اشتراكاً سحابياً نشطاً 🔒'}
              </Text>
            </View>

            {hasActiveSubscription ? (
              <Switch
                value={isCloudMode}
                onValueChange={handleToggleCloud}
                color={theme.colors.primary}
              />
            ) : (
              <View
                style={[
                  styles.lockedBadge,
                  {
                    backgroundColor: theme.dark ? '#2D1B1B' : '#FEF2F2',
                    borderColor: theme.colors.error + '40',
                  },
                ]}
              >
                <Lock size={11} color={theme.colors.error} />
                <Text
                  style={{ fontSize: 11, color: theme.colors.error, fontFamily: 'Cairo_700Bold' }}
                >
                  اشترك
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </Section>
      </Animated.View>

      <Animated.View>
        <Section title={ar.settings.security}>
          <SettingRow
            title={ar.settings.changePassword}
            Icon={Shield}
            onPress={() => router.push('/(main)/change-password')}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title={ar.settings.helpCenter}
            Icon={HelpCircle}
            iconBg={theme.colors.tertiaryContainer}
            iconColor={theme.colors.tertiary}
            onPress={() => router.push('/(main)/help-center')}
          />
        </Section>
      </Animated.View>

      <Animated.View>
        <Section>
          <SettingRow
            title={ar.settings.logout}
            Icon={LogOut}
            danger
            onPress={async () => {
              const { logoutFromCloud } = require('../../core/supabase/syncService');
              try {
                await logoutFromCloud();
              } catch (e) {
                console.warn('[Logout] Cloud logout error:', e);
              }
              clearUser();
              router.replace('/(auth)/login');
            }}
          />
        </Section>
      </Animated.View>

      <SyncProgressModal
        visible={syncModalVisible}
        progress={syncProgress}
        onClose={() => setSyncModalVisible(false)}
      />

      <Modal
        visible={editProfileVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editModalOverlay}
        >
          <View style={[styles.editModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                تعديل البيانات الشخصية
              </Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)} style={{ padding: 6 }}>
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={[styles.editErrorBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                  {editError}
                </Text>
              </View>
            ) : null}

            <AppInput label="الاسم الكامل" icon="user" value={editName} onChangeText={setEditName} />
            <View style={{ height: 12 }} />
            <AppInput
              label="رقم الهاتف"
              icon="phone"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <View style={{ height: 20 }} />
            <AppButton
              label="حفظ التعديلات"
              onPress={() => updateProfileMutation.mutate()}
              loading={updateProfileMutation.isPending}
              disabled={updateProfileMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 24, borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  profileInfo: { flex: 1, paddingHorizontal: 14 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  editBtn: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 16 },
  sectionCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1, paddingHorizontal: 12 },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editErrorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
});
