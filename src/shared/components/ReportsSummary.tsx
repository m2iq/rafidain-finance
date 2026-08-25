import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import { TrendingUp, ArrowDownLeft, Calendar } from 'lucide-react-native';
import { useReports, ReportPeriod } from '../../features/reports/api/useReports';
import { formatCurrency } from '../utils/currency';
import ar from '../i18n/ar';

import { useRouter } from 'expo-router';

export default function ReportsSummary() {
  const theme = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const { data: reports, isLoading } = useReports(period);

  const renderPeriodButton = (p: ReportPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        { backgroundColor: period === p ? theme.colors.primary : 'transparent' }
      ]}
      onPress={() => setPeriod(p)}
    >
      <Text
        style={{
          color: period === p ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
          fontWeight: period === p ? 'bold' : 'normal',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
          الملخص المالي
        </Text>
        <TouchableOpacity onPress={() => router.push('/(main)/reports')}>
          <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_600SemiBold' }}>
            عرض التفاصيل
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
        <View style={styles.periodSelector}>
          {renderPeriodButton('daily', 'اليوم')}
          {renderPeriodButton('weekly', 'الأسبوع')}
          {renderPeriodButton('monthly', 'الشهر')}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]} elevation={1}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <TrendingUp color={theme.colors.primary} size={24} />
            </View>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              إجمالي الدخل
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {formatCurrency(reports?.income || 0)}
            </Text>
          </Surface>

          <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]} elevation={1}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.errorContainer }]}>
              <ArrowDownLeft color={theme.colors.error} size={24} />
            </View>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              الديون الجديدة
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.error }}>
              {formatCurrency(reports?.newDebt || 0)}
            </Text>
          </Surface>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
