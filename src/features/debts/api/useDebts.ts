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

export function useDebtPayments(debtId?: string) {
  return useQuery({
    queryKey: ['debtPayments', debtId],
    queryFn: async () => {
      if (!debtId) return [];
      return DebtRepository.getPaymentsForDebt(debtId);
    },
    enabled: !!debtId,
  });
}

export function useDebtItems(debtId?: string) {
  return useQuery({
    queryKey: ['debtItems', debtId],
    queryFn: async () => {
      if (!debtId) return [];
      return DebtRepository.getDebtItems(debtId);
    },
    enabled: !!debtId,
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
      type?: 'debt' | 'installment';
    }) => {
      return DebtRepository.create(newDebt);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function usePayDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debtId,
      amount,
      storeId,
      paymentMethod,
      notes,
    }: {
      debtId: string;
      amount: number;
      storeId?: string;
      paymentMethod?: string;
      notes?: string;
    }) => {
      return DebtRepository.recordPayment(debtId, amount, storeId, paymentMethod, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['debtPayments', variables.debtId] });
    },
  });
}

export function useAddDebtItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debtId,
      description,
      amount,
      storeId,
    }: {
      debtId: string;
      description: string;
      amount: number;
      storeId: string;
    }) => {
      return DebtRepository.addDebtItem(debtId, description, amount, storeId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['debtItems', variables.debtId] });
    },
  });
}
