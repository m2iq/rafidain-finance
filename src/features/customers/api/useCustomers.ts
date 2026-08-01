import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomerRepository, Customer } from '../../../core/database/repositories/CustomerRepository';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const customers = CustomerRepository.getAll();
      return customers;
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCustomer: { store_id: string; name: string; phone?: string; address?: string; notes?: string; status: 'active' | 'inactive' }) => {
      return CustomerRepository.create({
        store_id: newCustomer.store_id,
        name: newCustomer.name,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        notes: newCustomer.notes || null,
        status: newCustomer.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
