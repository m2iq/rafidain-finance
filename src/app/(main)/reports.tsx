import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import {
  ChevronRight, DollarSign, TrendingDown, TrendingUp,
  ArrowDownLeft, ArrowUpRight, FileText, Users, CreditCard,
  Clock, CheckCircle, Calendar, AlertCircle, ShoppingBag,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../shared/utils/currency';
import { useDetailedReport, ReportPeriod } from '../../features/reports/api/useReports';

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: 'اليوم', value: 'daily' },
  { label: 'أسبوع', value: 'weekly' },
  { label: 'شهر', value: 'monthly' },
  { label: 'سنة', value: 'yearly' },
  { label: 'الكل', value: 'all' },
];

const SECTIONS = ['عام', 'الديون', 'الأقساط', 'الدفعات'] as const;
type Section = typeof SECTIONS[number];

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const theme = useTheme();
  return (
    <View style={statRowStyles.row}>
      <Text style={[statRowStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[statRowStyles.value, { color: valueColor || theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const statRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  label: { fontFamily: 'Cairo_600SemiBold', fontSize: 13 },
  value: { fontFamily: 'Cairo_700Bold', fontSize: 14 },
});

function SectionCard({ title, color, icon: Icon, children }: {
  title: string; color: string; icon: any; children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[sCardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={sCardStyles.header}>
        <View style={[sCardStyles.iconBox, { backgroundColor: color + '18' }]}>
          <Icon size={18} color={color} />
        </View>
        <Text style={[sCardStyles.title, { color: theme.colors.onSurface }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sCardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 15,
  },
});

export default function ReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [activeSection, setActiveSection] = useState<Section>('عام');

  const { data, isLoading } = useDetailedReport(period);

  const renderContent = () => {
    if (isLoading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;
    if (!data) return null;

    if (activeSection === 'عام') {
      return (
        <>
          {/* Big Income Card */}
          <View style={[styles.bigCard, { backgroundColor: '#064E3B' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ color: '#6EE7B7', fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                  إجمالي التحصيلات (في هذه الفترة)
                </Text>
                <Text style={{ color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 26, marginTop: 4 }}>
                  {formatCurrency(data.income ?? 0)}
                </Text>
              </View>
              <View style={[styles.bigCardIcon, { backgroundColor: '#065F46' }]}>
                <ArrowDownLeft color="#34D399" size={24} />
              </View>
            </View>
            <Text style={{ color: '#A7F3D0', fontFamily: 'Cairo_400Regular', fontSize: 13, marginTop: 12 }}>
              {data.paymentStats?.count ?? 0} عملية تسديد في هذه الفترة
            </Text>
          </View>

          {/* Row 1: Customers & Total Remaining */}
          <View style={styles.twoCol}>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Users size={20} color="#2563EB" />
              <Text style={[styles.miniLabel, { color: '#2563EB' }]}>عملاء عليهم متبقي</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#93C5FD' : '#1E3A8A' }]}>
                {data.activeCustomers ?? 0} عميل
              </Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#FEF2F2', borderColor: '#FECACA' }]}>
              <TrendingDown size={20} color="#DC2626" />
              <Text style={[styles.miniLabel, { color: '#DC2626' }]}>إجمالي المتبقي الكلي</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#FCA5A5' : '#991B1B' }]}>
                {formatCurrency(data.totalRemainingOverall ?? 0)}
              </Text>
            </View>
          </View>

          {/* Row 2: Remaining Debts vs Remaining Installments */}
          <View style={styles.twoCol}>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#FFF7ED', borderColor: '#FFEDD5' }]}>
              <ShoppingBag size={20} color="#EA580C" />
              <Text style={[styles.miniLabel, { color: '#EA580C' }]}>ديون متبقية بالسوق</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#FDBA74' : '#9A3412' }]}>
                {formatCurrency(data.debtStats?.totalRemaining ?? 0)}
              </Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#FAF5FF', borderColor: '#F3E8FF' }]}>
              <CreditCard size={20} color="#7C3AED" />
              <Text style={[styles.miniLabel, { color: '#7C3AED' }]}>أقساط متبقية بالسوق</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#C4B5FD' : '#5B21B6' }]}>
                {formatCurrency(data.installmentStats?.totalRemaining ?? 0)}
              </Text>
            </View>
          </View>

          {/* Row 3: Overdue Stats */}
          <View style={styles.twoCol}>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Clock size={20} color="#D97706" />
              <Text style={[styles.miniLabel, { color: '#D97706' }]}>ديون متأخرة</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#FCD34D' : '#92400E' }]}>
                {data.debtStats?.overdue ?? 0}
              </Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: theme.dark ? '#1e293b' : '#FEF3C7', borderColor: '#FDE68A' }]}>
              <AlertCircle size={20} color="#D97706" />
              <Text style={[styles.miniLabel, { color: '#D97706' }]}>أقساط متأخرة</Text>
              <Text style={[styles.miniValue, { color: theme.dark ? '#FCD34D' : '#92400E' }]}>
                {data.installmentStats?.overdue ?? 0}
              </Text>
            </View>
          </View>
        </>
      );
    }

    if (activeSection === 'الديون') {
      return (
        <>
          <SectionCard title="إحصائيات عقود الديون" color="#EA580C" icon={ShoppingBag}>
            <StatRow label="إجمالي عدد الديون" value={String(data.debtStats?.total ?? 0)} />
            <StatRow label="ديون جارية (عليها متبقي)" value={String(data.debtStats?.active ?? 0)} valueColor="#F59E0B" />
            <StatRow label="ديون مسددة بالكامل" value={String(data.debtStats?.paid ?? 0)} valueColor="#10B981" />
            <StatRow label="ديون متأخرة عن موعدها" value={String(data.debtStats?.overdue ?? 0)} valueColor="#EF4444" />
          </SectionCard>

          <SectionCard title="المبالغ المالية للديون" color="#2563EB" icon={DollarSign}>
            <StatRow label="إجمالي مبالغ الديون" value={formatCurrency(data.debtStats?.totalAmount ?? 0)} />
            <StatRow label="تم تحصيله (المدفوع)" value={formatCurrency(data.debtStats?.totalCollected ?? 0)} valueColor="#10B981" />
            <StatRow label="المتبقي في ذمة العملاء" value={formatCurrency(data.debtStats?.totalRemaining ?? 0)} valueColor="#EF4444" />
          </SectionCard>

          <SectionCard title="حركة الديون في هذه الفترة" color="#059669" icon={ArrowUpRight}>
            <StatRow label="ديون جديدة أضيفت بالفترة" value={String(data.debtStats?.newInPeriod ?? 0)} />
            <StatRow label="مجموع مبالغ الديون الجديدة" value={formatCurrency(data.debtStats?.newAmountInPeriod ?? 0)} />
            <StatRow label="دفعات ديون تم تحصيلها بالفترة" value={`${data.debtStats?.paymentsCountInPeriod ?? 0} دفعة`} valueColor="#10B981" />
            <StatRow label="المبلغ المحصل للديون بالفترة" value={formatCurrency(data.debtStats?.collectedInPeriod ?? 0)} valueColor="#10B981" />
          </SectionCard>
        </>
      );
    }

    if (activeSection === 'الأقساط') {
      return (
        <>
          <SectionCard title="إحصائيات عقود الأقساط" color="#7C3AED" icon={CreditCard}>
            <StatRow label="إجمالي عقود الأقساط" value={String(data.installmentStats?.total ?? 0)} />
            <StatRow label="أقساط جارية (عليها متبقي)" value={String(data.installmentStats?.active ?? 0)} valueColor="#F59E0B" />
            <StatRow label="أقساط مسددة بالكامل" value={String(data.installmentStats?.paid ?? 0)} valueColor="#10B981" />
            <StatRow label="أقساط متأخرة عن موعدها" value={String(data.installmentStats?.overdue ?? 0)} valueColor="#EF4444" />
          </SectionCard>

          <SectionCard title="المبالغ المالية للأقساط" color="#2563EB" icon={DollarSign}>
            <StatRow label="إجمالي قيمة عقود الأقساط" value={formatCurrency(data.installmentStats?.totalAmount ?? 0)} />
            <StatRow label="تم تحصيله (المدفوع)" value={formatCurrency(data.installmentStats?.totalCollected ?? 0)} valueColor="#10B981" />
            <StatRow label="المتبقي في ذمة العملاء" value={formatCurrency(data.installmentStats?.totalRemaining ?? 0)} valueColor="#EF4444" />
          </SectionCard>

          <SectionCard title="حركة الأقساط في هذه الفترة" color="#059669" icon={Calendar}>
            <StatRow label="عقود أقساط أضيفت بالفترة" value={String(data.installmentStats?.newInPeriod ?? 0)} />
            <StatRow label="مجموع مبالغ الأقساط الجديدة" value={formatCurrency(data.installmentStats?.newAmountInPeriod ?? 0)} />
            <StatRow label="دفعات أقساط تم تحصيلها بالفترة" value={`${data.installmentStats?.paymentsCountInPeriod ?? 0} دفعة`} valueColor="#10B981" />
            <StatRow label="المبلغ المحصل للأقساط بالفترة" value={formatCurrency(data.installmentStats?.collectedInPeriod ?? 0)} valueColor="#10B981" />
            <StatRow label="أقساط تستحق خلال الفترة" value={`${data.installmentStats?.dueInPeriod ?? 0} قسط`} />
            <StatRow label="مجموع مبالغ الأقساط المستحقة" value={formatCurrency(data.installmentStats?.dueAmountInPeriod ?? 0)} />
          </SectionCard>
        </>
      );
    }

    if (activeSection === 'الدفعات') {
      return (
        <>
          <SectionCard title="ملخص التحصيلات في هذه الفترة" color="#10B981" icon={CheckCircle}>
            <StatRow label="إجمالي عدد الدفعات" value={`${data.paymentStats?.count ?? 0} عملية تسديد`} />
            <StatRow label="إجمالي المبالغ المحصلة" value={formatCurrency(data.paymentStats?.totalAmount ?? 0)} valueColor="#10B981" />
            <StatRow label="تحصيلات الديون العادية" value={`${formatCurrency(data.paymentStats?.debtPaymentsAmount ?? 0)} (${data.paymentStats?.debtPaymentsCount ?? 0} دفعة)`} />
            <StatRow label="تحصيلات الأقساط" value={`${formatCurrency(data.paymentStats?.installmentPaymentsAmount ?? 0)} (${data.paymentStats?.installmentPaymentsCount ?? 0} دفعة)`} valueColor="#7C3AED" />
          </SectionCard>

          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: theme.colors.onBackground }}>
              سجل الدفعات ({data.recentPayments?.length ?? 0})
            </Text>
          </View>

          {(data.recentPayments?.length ?? 0) > 0 ? (
            data.recentPayments.map((item: any) => {
              const isInstallment = item.debtType === 'installment';
              return (
                <View key={item.id} style={[styles.paymentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                  <View style={styles.paymentLeft}>
                    <View style={[styles.paymentIcon, { backgroundColor: isInstallment ? '#F3E8FF' : '#DCFCE7' }]}>
                      {isInstallment ? (
                        <CreditCard size={18} color="#7C3AED" />
                      ) : (
                        <DollarSign size={18} color="#16A34A" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Cairo_700Bold', color: theme.colors.onSurface, fontSize: 14 }}>
                        {item.customerName || 'عميل غير معرف'}
                      </Text>
                      <Text style={{ fontFamily: 'Cairo_600SemiBold', color: isInstallment ? '#7C3AED' : '#EA580C', fontSize: 12 }}>
                        {isInstallment ? 'قسط: ' : 'دين: '}{item.debtTitle || 'بدون عنوان'}
                      </Text>
                      <Text style={{ fontFamily: 'Cairo_400Regular', color: theme.colors.outline, fontSize: 11, marginTop: 2 }}>
                        {item.payment_date} {item.payment_method ? `· ${item.payment_method === 'cash' ? 'نقدي' : item.payment_method}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'Cairo_700Bold', color: '#10B981', fontSize: 15 }}>
                      +{formatCurrency(item.amount)}
                    </Text>
                    {item.type === 'down_payment' && (
                      <Text style={{ fontFamily: 'Cairo_600SemiBold', color: '#3B82F6', fontSize: 11 }}>
                        مقدمة
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={theme.colors.outlineVariant} />
              <Text style={{ color: theme.colors.outline, marginTop: 16, fontFamily: 'Cairo_600SemiBold' }}>
                لا توجد دفعات مسجلة في هذه الفترة
              </Text>
            </View>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* App Bar */}
      <View style={[styles.appBar, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronRight color={theme.colors.onBackground} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>التقارير المالية</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Period Selector */}
      <View style={[styles.periodRow, { backgroundColor: theme.colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {PERIODS.map((p) => {
            const isSelected = p.value === period;
            return (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodButton, isSelected && { backgroundColor: theme.colors.primary }]}
                onPress={() => setPeriod(p.value)}
              >
                <Text style={{
                  color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                  fontFamily: 'Cairo_700Bold',
                  fontSize: 13,
                }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: theme.colors.outlineVariant }]}>
        {SECTIONS.map((s) => {
          const isActive = s === activeSection;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.tab, isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveSection(s)}
            >
              <Text style={{
                fontFamily: isActive ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
                color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
                fontSize: 14,
              }}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  backButton: { padding: 4 },
  headerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18 },
  periodRow: { paddingVertical: 8 },
  periodButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  scrollContent: { padding: 16 },
  bigCard: {
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  bigCardIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  miniCard: {
    flex: 1, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1,
  },
  miniLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 11 },
  miniValue: { fontFamily: 'Cairo_700Bold', fontSize: 16 },
  paymentCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, marginBottom: 8, borderRadius: 14, borderWidth: 1,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  paymentIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyContainer: { padding: 40, alignItems: 'center' },
});
