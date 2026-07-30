import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Clock,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react-native';
import { Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Avatar, Surface, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAppStore } from '../../core/store/appStore';
import AmbientBackground from '../../shared/components/AmbientBackground';
import AnimatedTouchable from '../../shared/components/AnimatedTouchable';

// Recent Activity Mock
const RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    customerName: 'أحمد محمد علي',
    action: 'تسديد قسط',
    amount: '+$200',
    type: 'payment', // payment or new_debt
    time: 'منذ 15 دقيقة',
  },
  {
    id: 'act-2',
    customerName: 'سالم كريم حسن',
    action: 'دين جديد',
    amount: '-$500',
    type: 'debt',
    time: 'منذ ساعتين',
  },
  {
    id: 'act-3',
    customerName: 'مصطفى عادل',
    action: 'تسديد كامل',
    amount: '+$300',
    type: 'payment',
    time: 'منذ 5 ساعات',
  },
];

export default function DashboardScreen() {
  const user = useAppStore((s) => s.user);
  const isCloudMode = useAppStore((s) => s.isCloudMode);
  const theme = useTheme();
  const router = useRouter();

  const ACTIONS = [
    {
      id: 'add-customer',
      title: 'إضافة عميل',
      desc: 'تسجيل مدين جديد',
      icon: Users,
      illustration: require('@/assets/illustration/Add User-rafiki.png'),
      color: '#4F46E5',
      bgColor: theme.dark ? 'rgba(79, 70, 229, 0.25)' : '#EEF2FF',
      borderColor: theme.dark ? '#312E81' : '#C7D2FE',
      illustrationBg: theme.dark ? 'rgba(30, 27, 75, 0.6)' : '#F0F3FF',
      route: '/(main)/customers',
    },
    {
      id: 'add-debt',
      title: 'تسجيل دين',
      desc: 'إضافة فاتورة وقسط',
      icon: CreditCard,
      illustration: require('@/assets/illustration/App monetization-pana.png'),
      color: '#7C3AED',
      bgColor: theme.dark ? 'rgba(124, 58, 237, 0.25)' : '#F3E8FF',
      borderColor: theme.dark ? '#4C1D95' : '#DDD6FE',
      illustrationBg: theme.dark ? 'rgba(46, 16, 101, 0.6)' : '#F8F0FF',
      route: '/(main)/debts',
    },
    {
      id: 'installments',
      title: 'الأقساط المستحقة',
      desc: '3 أقساط تتطلب الإشعار',
      badge: '3',
      icon: Clock,
      illustration: require('@/assets/illustration/Generating new leads-rafiki.png'),
      color: '#D97706',
      bgColor: theme.dark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7',
      borderColor: theme.dark ? '#78350F' : '#FDE68A',
      illustrationBg: theme.dark ? 'rgba(69, 26, 3, 0.6)' : '#FFFBEB',
      route: '/(main)/debts',
    },
    {
      id: 'reports',
      title: 'التقارير المالية',
      desc: 'تحليل الأرباح والديون',
      icon: TrendingUp,
      illustration: require('@/assets/illustration/Report-amico.png'),
      color: '#059669',
      bgColor: theme.dark ? 'rgba(5, 150, 105, 0.25)' : '#D1FAE5',
      borderColor: theme.dark ? '#065F46' : '#A7F3D0',
      illustrationBg: theme.dark ? 'rgba(6, 78, 59, 0.6)' : '#ECFDF5',
      route: '/(main)/debts',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Top Bar Header */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.topHeader}>
          <View style={styles.userProfileRow}>
            <Avatar.Text
              size={44}
              label={user?.name ? user.name.charAt(0) : 'R'}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
            <View style={styles.userTextCol}>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontFamily: 'Cairo_700Bold' }}>
                الرئيسية
              </Text>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isCloudMode ? '#10B981' : '#94A3B8' },
                  ]}
                />
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                  {isCloudMode ? 'متصل' : 'محلي'}
                </Text>
              </View>
            </View>
          </View>

          <AnimatedTouchable
            style={[styles.syncButton, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            scaleTo={0.9}
          >
            <RefreshCw size={16} color={theme.colors.onSurface} />
          </AnimatedTouchable>
        </Animated.View>

        {/* Hero Financial Banner Card */}
        <Animated.View entering={FadeInDown.delay(90).duration(400)}>
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
            {/* Top row in card */}
            <View style={styles.heroTopRow}>
              <Text variant="titleSmall" style={{ color: '#C7D2FE', fontFamily: 'Cairo_600SemiBold' }}>
                إجمالي الديون القائمة
              </Text>
            </View>

            {/* Amount Display */}
            <View style={styles.heroAmountBox}>
              <Text variant="labelSmall" style={{ color: '#C7D2FE' }}>
                إجمالي الديون القائمة
              </Text>
              <Text variant="displaySmall" style={styles.heroMainAmount}>
                $12,500
              </Text>
            </View>

            {/* Sub Stats Row inside Hero */}
            <View style={styles.heroSubRow}>
              <View style={styles.heroSubItem}>
                <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
                  <ArrowDownLeft size={16} color="#34D399" strokeWidth={2.5} />
                </View>
                <View>
                  <Text variant="labelSmall" style={{ color: '#A7F3D0' }}>
                    تم التحصيل
                  </Text>
                  <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold' }}>
                    $4,200
                  </Text>
                </View>
              </View>

              <View style={[styles.heroSubDivider, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />

              <View style={styles.heroSubItem}>
                <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <ArrowUpRight size={16} color="#FBBF24" strokeWidth={2.5} />
                </View>
                <View>
                  <Text variant="labelSmall" style={{ color: '#FDE68A' }}>
                    العملاء المدينون
                  </Text>
                  <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold' }}>
                    24 عميل
                  </Text>
                </View>
              </View>
            </View>
          </Surface>
        </Animated.View>

        {/* Quick Actions Title */}
        <Animated.View entering={FadeInDown.delay(160).duration(380)} style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            الخدمات السريعة
          </Text>
        </Animated.View>

        {/* Quick Actions 2x2 Grid */}
        <View style={styles.gridContainer}>
          {ACTIONS.map((action, index) => {
            return (
              <Animated.View
                key={action.id}
                entering={FadeInRight.delay(index * 70 + 200).duration(350)}
                style={styles.gridItem}
              >
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
                  {/* Floating Badge (Absolute top-right) */}
                  {action.badge && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>{action.badge}</Text>
                    </View>
                  )}

                  {/* Illustration Hero */}
                  <View style={styles.proImageContainer}>
                    <Image
                      source={action.illustration}
                      style={styles.proImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Content (Bottom) */}
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

        {/* Recent Activity Section */}
        <Animated.View entering={FadeInDown.delay(350).duration(380)} style={styles.sectionTitleRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            العمليات الأخيرة
          </Text>
        </Animated.View>

        <View style={styles.activityList}>
          {RECENT_ACTIVITIES.map((act, i) => {
            const isPayment = act.type === 'payment';
            return (
              <Animated.View
                key={act.id}
                entering={FadeInDown.delay(i * 60 + 400).duration(320)}
              >
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
                      size={38}
                      label={act.customerName.charAt(0)}
                      style={{
                        backgroundColor: isPayment
                          ? theme.dark ? '#064E3B' : '#D1FAE5'
                          : theme.dark ? '#312E81' : '#EEF2FF',
                      }}
                      color={isPayment ? '#10B981' : '#6366F1'}
                    />
                    <View style={styles.activityInfo}>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                        {act.customerName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
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
                      {act.amount}
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
    paddingBottom: 110,
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
    gap: 12,
  },
  userTextCol: {
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  heroAmountBox: {
    marginBottom: 20,
  },
  heroMainAmount: {
    color: '#FFFFFF',
    fontFamily: 'Cairo_700Bold',
    marginTop: 4,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSubDivider: {
    width: 1,
    height: 28,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Cairo_700Bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: '48%',
  },
  proCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    paddingTop: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  proImageContainer: {
    width: 120,
    height: 110,
    marginBottom: 20,
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
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
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
    top: 14,
    right: 14,
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
    gap: 12,
  },
  activityInfo: {
    justifyContent: 'center',
  },
  activityLeft: {
    alignItems: 'flex-end',
  },
});
