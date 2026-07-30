import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, useTheme, Divider, Switch, Avatar } from 'react-native-paper';
import {
  Moon, Globe, Shield, HelpCircle, LogOut, Bell, ChevronLeft, User,
} from 'lucide-react-native';
import { useAppStore } from '../../core/store/appStore';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ── Settings Row ─────────────────────────────
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
  const bg    = danger ? theme.colors.errorContainer : (iconBg ?? theme.colors.primaryContainer);

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
          style={{ color: danger ? theme.colors.error : theme.colors.onSurface }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description && (
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 1 }}>
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

// ── Section wrapper ──────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      {title && (
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.outline, marginBottom: 8, marginHorizontal: 4, textTransform: 'uppercase' }}
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

// ── Screen ───────────────────────────────────
export default function SettingsScreen() {
  const theme         = useTheme();
  const router        = useRouter();
  const user          = useAppStore((s) => s.user);
  const clearUser     = useAppStore((s) => s.clearUser);
  const isCloudMode   = useAppStore((s) => s.isCloudMode);
  const toggleCloud   = useAppStore((s) => s.toggleCloudMode);
  const isDarkMode    = useAppStore((s) => s.isDarkMode);
  const toggleDark    = useAppStore((s) => s.toggleDarkMode);
  const [notif, setNotif] = React.useState(true);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Profile Card */}
      <Animated.View entering={FadeInDown.duration(350)}>
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Avatar.Text
            size={58}
            label={(user?.name ?? 'م').substring(0, 2)}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.primary}
          />
          <View style={styles.profileInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              {user?.name ?? 'صاحب المحل'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {user?.phone ?? '---'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary }}>مالك المحل</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.editBtn, { borderColor: theme.colors.outlineVariant }]}>
            <User size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* General */}
      <Animated.View entering={FadeInDown.delay(80).duration(350)}>
        <Section title="عام">
          <SettingRow
            title="الوضع الليلي"
            Icon={Moon}
            iconBg={theme.colors.secondaryContainer}
            iconColor={theme.colors.secondary}
            right={<Switch value={isDarkMode} onValueChange={toggleDark} color={theme.colors.primary} />}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title="الإشعارات"
            description="تنبيهات الأقساط المستحقة"
            Icon={Bell}
            iconBg={theme.colors.tertiaryContainer}
            iconColor={theme.colors.tertiary}
            right={<Switch value={notif} onValueChange={setNotif} color={theme.colors.primary} />}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title="المزامنة السحابية"
            description={isCloudMode ? 'نشطة — يتم المزامنة مع Supabase' : 'غير نشطة — وضع محلي'}
            Icon={Globe}
            iconBg={isCloudMode ? '#DCFCE7' : theme.colors.surfaceVariant}
            iconColor={isCloudMode ? '#16A34A' : theme.colors.outline}
            right={<Switch value={isCloudMode} onValueChange={toggleCloud} color={theme.colors.primary} />}
          />
        </Section>
      </Animated.View>

      {/* Security */}
      <Animated.View entering={FadeInDown.delay(160).duration(350)}>
        <Section title="الأمان">
          <SettingRow
            title="تغيير كلمة المرور"
            Icon={Shield}
            onPress={() => {}}
          />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <SettingRow
            title="مركز المساعدة"
            Icon={HelpCircle}
            iconBg={theme.colors.tertiaryContainer}
            iconColor={theme.colors.tertiary}
            onPress={() => {}}
          />
        </Section>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.delay(240).duration(350)}>
        <Section>
          <SettingRow
            title="تسجيل خروج"
            Icon={LogOut}
            danger
            onPress={() => { clearUser(); router.replace('/(auth)/login'); }}
          />
        </Section>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  content:     { padding: 16, paddingBottom: 110, gap: 0 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  profileInfo: { flex: 1 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  editBtn:     { width: 36, height: 36, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  section:     { marginBottom: 16 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText:     { flex: 1 },
});
