import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Clock,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Users,
  Eye,
  EyeOff,
  PlusCircle,
  UserPlus,
  CheckCircle2,
} from 'lucide-react-native';
import { Image, ScrollView, StatusBar, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Avatar, Surface, Text, useTheme } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../core/store/appStore';
import AmbientBackground from '../../shared/components/AmbientBackground';
import AnimatedTouchable from '../../shared/components/AnimatedTouchable';
import ar from '../../shared/i18n/ar';
import { formatCurrency } from '../../shared/utils/currency';

const RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    customerName: 'أحمد محمد علي',
    action: 'تسديد قسط شهري',
    amount: 200000,
    type: 'payment',
    time: 'منذ 15 دقيقة',
  },
  {
    id: 'act-2',
    customerName: 'سالم كريم حسن',
    action: 'شراء بضاعة بالأقساط',
    amount: -500000,
    type: 'debt',
    time: 'منذ ساعتين',
  },
  {
    id: 'act-3',
    customerName: 'مصطفى عادل',
    action: 'تسديد كامل الدين',
    amount: 300000,
    type: 'payment',
    time: 'منذ 5 ساعات',
  },
];

export default function DashboardScreen() {
  const user = useAppStore((s) => s.user);
  const isCloudMode = useAppStore((s) => s.isCloudMode);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hideBalances, setHideBalances] = useState(false);

  const ACTIONS = [
    {
      id: 'add-customer',
      title: ar.home.addCustomer,
      desc: ar.home.addCustomerDesc,
      icon: Users,
      illustration: require('@/assets/illustration/Add User-rafiki.png'),
      color: '#4F46E5',
      bgColor: theme.dark ? 'rgba(79, 70, 229, 0.25)' : '#EEF2FF',
      borderColor: theme.dark ? '#312E81' : '#C7D2FE',
      route: '/(main)/customers',
    },
    {
      id: 'add-debt',
      title: ar.home.addDebt,
      desc: ar.home.addDebtDesc,
      icon: CreditCard,
      illustration: require('@/assets/illustration/App monetization-pana.png'),
      color: '#7C3AED',
      bgColor: theme.dark ? 'rgba(124, 58, 237, 0.25)' : '#F3E8FF',
      borderColor: theme.dark ? '#4C1D95' : '#DDD6FE',
      route: '/(main)/debts',
    },
    {
      id: 'installments',
      title: ar.home.dueInstallments,
      desc: ar.home.dueInstallmentsDesc,
      badge: '3',
      icon: Clock,
      illustration: require('@/assets/illustration/Generating new leads-rafiki.png'),
      color: '#D97706',
      bgColor: theme.dark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7',
      borderColor: theme.dark ? '#78350F' : '#FDE68A',
      route: '/(main)/debts',
    },
    {
      id: 'reports',
      title: ar.home.reports,
      desc: ar.home.reportsDesc,
      icon: TrendingUp,
      illustration: require('@/assets/illustration/Report-amico.png'),
      color: '#059669',
      bgColor: theme.dark ? 'rgba(5, 150, 105, 0.25)' : '#D1FAE5',
      borderColor: theme.dark ? '#065F46' : '#A7F3D0',
      route: '/(main)/debts',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 90 + insets.bottom, paddingTop: Math.max(insets.top, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Top Header */}
        <Animated.View style={styles.topHeader}>
          <View style={styles.userProfileRow}>
            <Avatar.Text
              size={46}
              label={user?.name ? user.name.charAt(0) : 'م'}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
            <View style={styles.userTextCol}>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontFamily: 'Cairo_700Bold' }}>
                {user?.name ? `أهلاً بك، ${user.name}` : ar.home.title}
              </Text>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isCloudMode ? '#10B981' : '#94A3B8' },
                  ]}
                />
                <Text variant="labelSmall" style={{ color: theme.colors.outline, fontFamily: 'Cairo_600SemiBold' }}>
                  {isCloudMode ? ar.home.connected : ar.home.local}
                </Text>
              </View>
            </View>
          </View>

          <AnimatedTouchable
            style={[styles.syncButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            scaleTo={0.9}
          >
            <RefreshCw size={18} color={theme.colors.onSurface} />
          </AnimatedTouchable>
        </Animated.View>

        {/* Hero Card Banner */}
        <Animated.View>
          <Surface
            style={[
              styles.heroBanner,
              {
                backgroundColor: theme.dark ? '#1E1B4B' : '#4F46E5',
                borderColor: theme.dark ? '#312E81' : '#6366F1',
              },
            ]}
            elevation={3}
          >
            <View style={styles.heroTopRow}>
              <Text variant="titleSmall" style={{ color: '#C7D2FE', fontFamily: 'Cairo_600SemiBold' }}>
                {ar.home.totalDebts}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setHideBalances((h) => !h)}
                style={styles.eyeToggle}
              >
                {hideBalances ? (
                  <EyeOff size={18} color="#C7D2FE" />
                ) : (
                  <Eye size={18} color="#C7D2FE" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.heroAmountBox}>
              <Text variant="displaySmall" style={styles.heroMainAmount}>
                {hideBalances ? '•••••••• د.ع' : formatCurrency(12500000)}
              </Text>
            </View>

            <View style={styles.heroSubRow}>
              <View style={styles.heroSubItem}>
                <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
                  <ArrowDownLeft size={16} color="#34D399" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="labelSmall" style={{ color: '#A7F3D0' }}>
                    {ar.home.collected}
                  </Text>
                  <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold', marginTop: 1 }}>
                    {hideBalances ? '••••••' : formatCurrency(4200000)}
                  </Text>
                </View>
              </View>

              <View style={[styles.heroSubDivider, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />

              <View style={styles.heroSubItem}>
                <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <ArrowUpRight size={16} color="#FBBF24" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="labelSmall" style={{ color: '#FDE68A' }}>
                    {ar.home.debtorCustomers}
                  </Text>
                  <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold', marginTop: 1 }}>
                    24 {ar.common.customer}
                  </Text>
                </View>
              </View>
            </View>
          </Surface>
        </Animated.View>

        {/* Quick Actions Shortcuts */}
        <View style={styles.quickShortcutsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(main)/debts')}
            style={[styles.shortcutItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <PlusCircle size={18} color={theme.colors.primary} />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
              + تسجيل دين
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(main)/customers')}
            style={[styles.shortcutItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <UserPlus size={18} color="#7C3AED" />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
              + عميل جديد
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(main)/debts')}
            style={[styles.shortcutItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <CheckCircle2 size={18} color="#10B981" />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
              تسديد قسط
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Title: Quick Grid */}
        <Animated.View style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            {ar.home.quickActions}
          </Text>
        </Animated.View>

        <View style={styles.gridContainer}>
          {ACTIONS.map((action) => {
            return (
              <Animated.View key={action.id} style={styles.gridItem}>
                <AnimatedTouchable
                  scaleTo={0.96}
                  onPress={() => router.push(action.route as any)}
                  style={[
                    styles.proCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  {action.badge && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>{action.badge}</Text>
                    </View>
                  )}

                  <View style={styles.proImageContainer}>
                    <Image
                      source={action.illustration}
                      style={styles.proImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.proContent}>
                    <Text
                      style={[styles.proTitle, { color: theme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {action.title}
                    </Text>
                    <View style={[styles.proArrowBox, { backgroundColor: action.bgColor }]}>
                      <ChevronLeft size={16} color={action.color} strokeWidth={2.5} />
                    </View>
                  </View>
                </AnimatedTouchable>
              </Animated.View>
            );
          })}
        </View>

        {/* Section Title: Recent Activity */}
        <Animated.View style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            {ar.home.recentActivity}
          </Text>
        </Animated.View>

        <View style={styles.activityList}>
          {RECENT_ACTIVITIES.map((act) => {
            const isPayment = act.type === 'payment';
            const safeName = act.customerName || 'عميل';
            return (
              <Animated.View key={act.id}>
                <AnimatedTouchable
                  scaleTo={0.98}
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.activityRight}>
                    <Avatar.Text
                      size={40}
                      label={safeName.substring(0, 2)}
                      style={{
                        backgroundColor: isPayment
                          ? theme.dark ? '#064E3B' : '#D1FAE5'
                          : theme.dark ? '#312E81' : '#EEF2FF',
                      }}
                      color={isPayment ? '#10B981' : '#6366F1'}
                    />
                    <View style={styles.activityInfo}>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                        {safeName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                        {act.action} • {act.time}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityLeft}>
                    <Text
                      variant="titleMedium"
                      style={{
                        color: isPayment ? '#10B981' : theme.colors.onSurface,
                        fontFamily: 'Cairo_700Bold',
                      }}
                    >
                      {isPayment ? '+' : ''}{hideBalances ? '••••••' : formatCurrency(Math.abs(act.amount))}
                    </Text>
                  </View>
                </AnimatedTouchable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextCol: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyeToggle: {
    padding: 6,
  },
  heroAmountBox: {
    marginBottom: 20,
  },
  heroMainAmount: {
    color: '#FFFFFF',
    fontFamily: 'Cairo_700Bold',
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSubDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  shortcutItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Cairo_700Bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: '48%',
  },
  proCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    paddingTop: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  proImageContainer: {
    width: 110,
    height: 100,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proImage: {
    width: '100%',
    height: '100%',
  },
  proContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 13,
    flex: 1,
    marginRight: 6,
  },
  proArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 10,
  },
  proBadgeText: {
    color: '#FFF',
    fontFamily: 'Cairo_700Bold',
    fontSize: 10,
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  activityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityInfo: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    flex: 1,
  },
  activityLeft: {
    alignItems: 'flex-end',
  },
});
