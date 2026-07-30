import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, ScrollView } from 'react-native';
import { Text, useTheme, FAB, Avatar, Surface, Chip } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { Search, Plus, UserPlus, MoreVertical, Phone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';

const DUMMY: any[] = [
  { id: '1', name: 'أحمد محمد علي', phone: '07701234567', address: 'بغداد - المنصور', total_debt: 850, status: 'active' },
  { id: '2', name: 'سالم كريم حسن', phone: '07801234567', address: 'بغداد - الكرادة', total_debt: 2100, status: 'overdue' },
  { id: '3', name: 'مصطفى عادل', phone: '07901234567', address: 'البصرة - الجزائر', total_debt: 0, status: 'paid' },
  { id: '4', name: 'ليلى حسين', phone: '07701112233', address: 'أربيل - العرصات', total_debt: 500, status: 'active' },
  { id: '5', name: 'عمر فاروق التميمي', phone: '07819998877', address: 'النجف - حي الحسين', total_debt: 1400, status: 'overdue' },
];

function CustomerStatsHeader({ total, active, paid }: { total: number; active: number; paid: number }) {
  const theme = useTheme();
  return (
    <Surface
      style={[
        styles.statsBar,
        {
          backgroundColor: theme.dark ? '#111726' : '#FFFFFF',
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          العملاء
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
          {total}
        </Text>
      </View>

      <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />

      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          عليهم ديون
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
          {active}
        </Text>
      </View>

      <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />

      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          مسددون
        </Text>
        <Text variant="titleMedium" style={{ color: '#10B981', fontFamily: 'Cairo_700Bold' }}>
          {paid}
        </Text>
      </View>
    </Surface>
  );
}

function CustomerCard({ item, index }: { item: any; index: number }) {
  const theme = useTheme();
  const hasDebt = item.total_debt > 0;
  const isOverdue = item.status === 'overdue';

  const badgeBg = !hasDebt
    ? theme.dark ? '#064E3B' : '#D1FAE5'
    : isOverdue
    ? theme.dark ? '#4C0519' : '#FFE4E6'
    : theme.dark ? '#1E1B4B' : '#EEF2FF';

  const badgeText = !hasDebt
    ? '#10B981'
    : isOverdue
    ? '#E11D48'
    : '#4F46E5';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(320)} exiting={FadeOut}>
      <TouchableOpacity
        activeOpacity={0.78}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {/* Avatar with Status ring */}
        <View style={styles.avatarWrap}>
          <Avatar.Text
            size={48}
            label={item.name.substring(0, 2)}
            style={{
              backgroundColor: theme.colors.primaryContainer,
            }}
            color={theme.colors.primary}
          />
        </View>

        {/* Customer Details */}
        <View style={styles.cardBody}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.iconMeta}>
              <Phone size={12} color={theme.colors.outline} />
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginRight: 4 }}>
                {item.phone}
              </Text>
            </View>

            {item.address && (
              <View style={[styles.iconMeta, { marginRight: 10 }]}>
                <MapPin size={12} color={theme.colors.outline} />
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginRight: 4 }} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Debt Tag */}
        <View style={[styles.debtTag, { backgroundColor: badgeBg }]}>
          <Text variant="labelSmall" style={{ color: badgeText, fontFamily: 'Cairo_700Bold' }}>
            {hasDebt ? `$${item.total_debt}` : 'مسدد ✓'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CustomersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setData(DUMMY); setLoading(false); }, 600);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data.filter((c) => {
    const matchesQuery = !query || c.name.includes(query) || c.phone.includes(query);
    if (filter === 'debt') return matchesQuery && c.total_debt > 0;
    if (filter === 'paid') return matchesQuery && c.total_debt === 0;
    return matchesQuery;
  });

  const totalCount = data.length;
  const activeDebtCount = data.filter((d) => d.total_debt > 0).length;
  const paidCount = data.filter((d) => d.total_debt === 0).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.topSection}>
        {/* Stats Header */}
        <CustomerStatsHeader total={totalCount} active={activeDebtCount} paid={paidCount} />

        {/* Search */}
        <TextInput
          mode="outlined"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          outlineStyle={styles.searchOutline}
          placeholderTextColor={theme.colors.outline}
          left={<TextInput.Icon icon={() => <Search size={20} color={theme.colors.outline} />} />}
        />

        {/* Filters */}
        <View style={styles.filterRow}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[styles.chip, filter === 'all' && { backgroundColor: theme.colors.primaryContainer }]}
            textStyle={[styles.chipText, filter === 'all' && { color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }]}
          >
            الكل ({totalCount})
          </Chip>
          <Chip
            selected={filter === 'debt'}
            onPress={() => setFilter('debt')}
            style={[styles.chip, filter === 'debt' && { backgroundColor: theme.dark ? '#1E1B4B' : '#EEF2FF' }]}
            textStyle={[styles.chipText, filter === 'debt' && { color: '#4F46E5', fontFamily: 'Cairo_700Bold' }]}
          >
            عليهم ديون ({activeDebtCount})
          </Chip>
          <Chip
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
            style={[styles.chip, filter === 'paid' && { backgroundColor: theme.dark ? '#064E3B' : '#D1FAE5' }]}
            textStyle={[styles.chipText, filter === 'paid' && { color: '#10B981', fontFamily: 'Cairo_700Bold' }]}
          >
            مسددون ({paidCount})
          </Chip>
        </View>
      </View>

      {/* Main List */}
      <FlashList
        data={filtered}
        renderItem={({ item, index }) => <CustomerCard item={item} index={index} />}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => { setData(DUMMY); setRefreshing(false); }, 600);
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

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
  container: { flex: 1 },
  topSection: { padding: 16, paddingBottom: 4 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 18,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statCol: { alignItems: 'center' },
  statDivider: { width: 1, height: 26 },
  search: { fontFamily: 'Cairo_400Regular', fontSize: 14, marginBottom: 10 },
  searchOutline: { borderRadius: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  chip: { borderRadius: 20, height: 34 },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 110 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },
  avatarWrap: { marginLeft: 2 },
  cardBody: { flex: 1, marginHorizontal: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  iconMeta: { flexDirection: 'row', alignItems: 'center' },
  debtTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  fab: { position: 'absolute', right: 20, borderRadius: 28 },
});
