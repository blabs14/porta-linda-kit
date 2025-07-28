import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFixedExpenses, createFixedExpense, updateFixedExpense, deleteFixedExpense } from '../services/fixed_expenses';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useFixedExpenses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: async () => {
      const { data, error } = await getFixedExpenses();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateFixedExpense = () => {
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (data: any) => {
      const { data: result, error } = await createFixedExpense(data);
      if (error) throw error;
      return result;
    },
    {
      operation: 'create',
      entityName: 'Despesa Fixa',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['fixedExpenses'] });
      },
    }
  );
};

export const useUpdateFixedExpense = () => {
  const queryClient = useQueryClient();

  return useCrudMutation(
    async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateFixedExpense(id, data);
      if (error) throw error;
      return result;
    },
    {
      operation: 'update',
      entityName: 'Despesa Fixa',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['fixedExpenses'] });
      },
    }
  );
};

export const useDeleteFixedExpense = () => {
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (id: string) => {
      const { data, error } = await deleteFixedExpense(id);
      if (error) throw error;
      return data;
    },
    {
      operation: 'delete',
      entityName: 'Despesa Fixa',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['fixedExpenses'] });
      },
    }
  );
}; 