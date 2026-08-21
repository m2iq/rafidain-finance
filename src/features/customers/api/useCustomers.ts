import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomerRepository, Customer } from '../../../core/database/repositories/CustomerRepository';
import { useAppStore } from '../../../core/store/appStore';

export function useCustomers() {
  const user = useAppStore((s) => s.user);

  return useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return CustomerRepository.getAll(user.id);
    },
    enabled: !!user?.id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCustomer: { store_id: string; name: string; phone?: string; address?: string; latitude?: number; longitude?: number; notes?: string; status: 'active' | 'inactive' }) => {
      return CustomerRepository.create({
        store_id: newCustomer.store_id,
        name: newCustomer.name,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        latitude: newCustomer.latitude || null,
        longitude: newCustomer.longitude || null,
        notes: newCustomer.notes || null,
        status: newCustomer.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return CustomerRepository.softDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string, updates: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>> }) => {
      return CustomerRepository.update(args.id, args.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
