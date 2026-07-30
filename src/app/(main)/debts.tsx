import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Text, useTheme, FAB, Avatar, ProgressBar, Surface, Chip } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import {
  CreditCard,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  DollarSign,
  Filter,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';

// Mock Data for Production Demonstration
const MOCK_DEBTS = [
  {
    id: 'd1',
    customerName: 'أحمد محمد علي',
    customerPhone: '07701234567',
    title: 'شراء بضاعة - ثلاجة حافظ 18 قدم',
    totalAmount: 1200,
    paidAmount: 800,
    dueDate: '2026-08-01',
    status: 'active', // active, overdue, paid
    installmentsCount: 4,
    paidInstallments: 2,
    nextInstallmentDate: 'غداً',
    nextInstallmentAmount: 200,
  },
  {
    id: 'd2',
    customerName: 'سالم كريم حسن',
    customerPhone: '07801234567',
    title: 'دفعة أجهزة كهربائية ومكيف',
    totalAmount: 2500,
    paidAmount: 400,
    dueDate: '2026-07-25',
    status: 'overdue',
    installmentsCount: 5,
    paidInstallments: 1,
    nextInstallmentDate: 'متأخر 3 أيام',
    nextInstallmentAmount: 500,
  },
  {
    id: 'd3',
    customerName: 'ليلى حسين',
    customerPhone: '07701112233',
    title: 'قسط شاشة سامسونج 55 بوصة',
    totalAmount: 500,
    paidAmount: 500,
    dueDate: '2026-07-10',
    status: 'paid',
    installmentsCount: 2,
    paidInstallments: 2,
    nextInstallmentDate: 'مكتمل',
    nextInstallmentAmount: 0,
  },
  {
    id: 'd4',
    customerName: 'مصطفى عادل',
    customerPhone: '07901234567',
    title: 'مواد منزلية متفرقة',
    totalAmount: 950,
    paidAmount: 300,
    dueDate: '2026-08-15',
    status: 'active',
    installmentsCount: 3,
    paidInstallments: 1,
    nextInstallmentDate: '15 أغسطس',
    nextInstallmentAmount: 325,
  },
];

// Summary Header Card Component
function DebtSummaryHeader() {
  const theme = useTheme();
  return (
    <Surface
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.dark ? '#191C35' : '#EEF2FF',
          borderColor: theme.dark ? '#292D54' : '#E0E7FF',
        },
      ]}
      elevation={1}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            إجمالي الديون القائمة
          </Text>
          <Text variant="titleLarge" style={[styles.summaryAmount, { color: theme.colors.primary }]}>
            $3,150
          </Text>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.summaryItem}>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            الأقساط المتأخرة
          </Text>
          <Text variant="titleLarge" style={[styles.summaryAmount, { color: '#EF4444' }]}>
            $500
          </Text>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.summaryItem}>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            المستحق هذا الشهر
          </Text>
          <Text variant="titleLarge" style={[styles.summaryAmount, { color: '#F59E0B' }]}>
            $1,025
          </Text>
        </View>
      </View>
    </Surface>
  );
}

// Single Debt Card Component
function DebtCard({ item, index }: { item: typeof MOCK_DEBTS[0]; index: number }) {
  const theme = useTheme();
  const progress = item.totalAmount > 0 ? item.paidAmount / item.totalAmount : 0;
  const remaining = item.totalAmount - item.paidAmount;

  const isOverdue = item.status === 'overdue';
  const isPaid = item.status === 'paid';

  const statusBg = isPaid
    ? theme.dark ? '#143823' : '#DCFCE7'
    : isOverdue
    ? theme.dark ? '#3B1515' : '#FEE2E2'
    : theme.dark ? '#332612' : '#FEF3C7';

  const statusColor = isPaid
    ? '#16A34A'
    : isOverdue
    ? '#EF4444'
    : '#D97706';

  const statusLabel = isPaid ? 'مكتمل' : isOverdue ? 'متأخر' : 'نشط (قيد السداد)';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} exiting={FadeOut}>
      <TouchableOpacity
        activeOpacity={0.78}
        style={[
          styles.debtCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {/* Customer Header */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <Avatar.Text
              size={40}
              label={item.customerName.substring(0, 2)}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
            <View style={styles.nameBlock}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                {item.customerName}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {item.customerPhone}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text variant="labelSmall" style={{ color: statusColor, fontFamily: 'Cairo_600SemiBold' }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Debt Title */}
        <Text variant="bodyMedium" style={[styles.debtTitle, { color: theme.colors.onSurface }]}>
          {item.title}
        </Text>

        {/* Progress Bar & Amount Summary */}
        <View style={styles.progressSection}>
          <View style={styles.amountRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              تم سداد: <Text style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold' }}>${item.paidAmount}</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              المتبقي: <Text style={{ color: theme.colors.error, fontFamily: 'Cairo_700Bold' }}>${remaining}</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
              ${item.totalAmount}
            </Text>
          </View>

          <ProgressBar
            progress={progress}
            color={isPaid ? '#16A34A' : isOverdue ? '#EF4444' : theme.colors.primary}
            style={styles.progressBar}
          />
        </View>

        {/* Footer: Installment Info & Quick Pay Action */}
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outlineVariant }]}>
          <View style={styles.installmentInfo}>
            <Clock size={15} color={isOverdue ? '#EF4444' : theme.colors.outline} />
            <Text
              variant="labelSmall"
              style={{
                color: isOverdue ? '#EF4444' : theme.colors.outline,
                marginRight: 6,
                fontFamily: 'Cairo_600SemiBold',
              }}
            >
              القسط القادم: {item.nextInstallmentDate} (${item.nextInstallmentAmount})
            </Text>
          </View>

          {!isPaid && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.payButton, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <DollarSign size={14} color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
                تسجيل دفعة
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DebtsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'paid'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<typeof MOCK_DEBTS>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setData(MOCK_DEBTS);
      setLoading(false);
    }, 700);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = data.filter((item) => {
    const matchesQuery =
      !query ||
      item.customerName.includes(query) ||
      item.title.includes(query) ||
      item.customerPhone.includes(query);
    if (filter === 'all') return matchesQuery;
    return matchesQuery && item.status === filter;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Summary Header Card */}
      <View style={styles.topSection}>
        <DebtSummaryHeader />

        {/* Search Input */}
        <TextInput
          mode="outlined"
          placeholder="ابحث باسم العميل أو تفاصيل الدين..."
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          outlineStyle={styles.searchOutline}
          placeholderTextColor={theme.colors.outline}
          left={<TextInput.Icon icon={() => <Search size={20} color={theme.colors.outline} />} />}
        />

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[
              styles.filterChip,
              filter === 'all' && { backgroundColor: theme.colors.primaryContainer },
            ]}
            textStyle={[
              styles.chipText,
              filter === 'all' && { color: theme.colors.primary, fontFamily: 'Cairo_700Bold' },
            ]}
          >
            الكل ({data.length})
          </Chip>

          <Chip
            selected={filter === 'active'}
            onPress={() => setFilter('active')}
            style={[
              styles.filterChip,
              filter === 'active' && { backgroundColor: '#FEF3C7' },
            ]}
            textStyle={[
              styles.chipText,
              filter === 'active' && { color: '#D97706', fontFamily: 'Cairo_700Bold' },
            ]}
          >
            نشط (قيد السداد)
          </Chip>

          <Chip
            selected={filter === 'overdue'}
            onPress={() => setFilter('overdue')}
            style={[
              styles.filterChip,
              filter === 'overdue' && { backgroundColor: '#FEE2E2' },
            ]}
            textStyle={[
              styles.chipText,
              filter === 'overdue' && { color: '#EF4444', fontFamily: 'Cairo_700Bold' },
            ]}
          >
            متأخر ⚠️
          </Chip>

          <Chip
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
            style={[
              styles.filterChip,
              filter === 'paid' && { backgroundColor: '#DCFCE7' },
            ]}
            textStyle={[
              styles.chipText,
              filter === 'paid' && { color: '#16A34A', fontFamily: 'Cairo_700Bold' },
            ]}
          >
            مكتمل ✓
          </Chip>
        </ScrollView>
      </View>

      {/* Main List */}
      <FlashList
        data={filtered}
        renderItem={({ item, index }) => <DebtCard item={item} index={index} />}
        estimatedItemSize={170}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                setData(MOCK_DEBTS);
                setRefreshing(false);
              }, 700);
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* FAB Button nicely positioned above bottom tab bar */}
      <FAB
        icon={() => <Plus size={24} color={theme.colors.onPrimary} />}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            bottom: 80 + insets.bottom,
          },
        ]}
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    padding: 16,
    paddingBottom: 4,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  summaryAmount: {
    fontFamily: 'Cairo_700Bold',
    marginTop: 4,
  },
  search: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
    marginBottom: 10,
  },
  searchOutline: {
    borderRadius: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    borderRadius: 20,
    height: 36,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  debtCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameBlock: {
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  debtTitle: {
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: 12,
    lineHeight: 22,
  },
  progressSection: {
    marginBottom: 14,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  installmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
  },
});
