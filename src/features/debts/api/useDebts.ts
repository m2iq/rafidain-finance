import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DebtRepository } from '../../../core/database/repositories/DebtRepository';
import { useAppStore } from '../../../core/store/appStore';

export function useDebts() {
  const user = useAppStore((s) => s.user);

  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return DebtRepository.getAll(user.id);
    },
    enabled: !!user?.id,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newDebt: {
      customer_id: string;
      store_id: string;
      title: string;
      total_amount: number;
      down_payment?: number;
      due_date?: string;
    }) => {
      return DebtRepository.create(newDebt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function usePayDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ debtId, amount, storeId }: { debtId: string; amount: number; storeId?: string }) => {
      return DebtRepository.recordPayment(debtId, amount, storeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
