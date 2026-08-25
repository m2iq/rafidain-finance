import { useQuery } from '@tanstack/react-query';
import { ReportRepository, ReportSummary } from '../../../core/database/repositories/ReportRepository';
import { useAppStore } from '../../../core/store/appStore';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

function getDatesForPeriod(period: ReportPeriod) {
  const now = new Date();
  const endDate = now.toISOString().substring(0, 10);
  let startDate: string;

  if (period === 'daily') {
    startDate = endDate;
  } else if (period === 'weekly') {
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate = lastWeek.toISOString().substring(0, 10);
  } else if (period === 'monthly') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    startDate = lastMonth.toISOString().substring(0, 10);
  } else if (period === 'yearly') {
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    startDate = lastYear.toISOString().substring(0, 10);
  } else {
    // 'all'
    startDate = '2000-01-01';
  }

  return { startDate, endDate };
}

export function useReports(period: ReportPeriod) {
  const user = useAppStore((s) => s.user);

  return useQuery({
    queryKey: ['reports', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return { income: 0, newDebt: 0 };
      const { startDate, endDate } = getDatesForPeriod(period);
      return ReportRepository.getSummary(user.id, startDate, endDate);
    },
    enabled: !!user?.id,
  });
}

export function useDetailedReport(period: ReportPeriod) {
  const user = useAppStore((s) => s.user);

  return useQuery({
    queryKey: ['detailedReport_v3', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return null;
      const { startDate, endDate } = getDatesForPeriod(period);
      return ReportRepository.getDetailedReport(user.id, startDate, endDate);
    },
    enabled: !!user?.id,
    staleTime: 0,
  });
}
