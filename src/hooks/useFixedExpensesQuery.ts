import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFixedExpenses, createFixedExpense, updateFixedExpense, deleteFixedExpense } from '../services/fixed_expenses';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';
import type { FixedExpense, FixedExpenseInsert, FixedExpenseUpdate } from '../integrations/supabase/types';
import { logger } from '@/shared/lib/logger';

export const useFixedExpenses = () => {
  const { user } = useAuth();

  return useQuery<FixedExpense[]>({
    queryKey: ['fixedExpenses'],
    queryFn: async () => {
      const { data, error } = await getFixedExpenses();
      if (error) throw error;
      return (data as FixedExpense[]) || [];
    },
    enabled: !!user,
  });
};

export const useCreateFixedExpense = () => {
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (data: FixedExpenseInsert) => {
      const { data: result, error } = await createFixedExpense(data);
      if (error) throw error;
      return result as FixedExpense | null;
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
    async ({ id, data }: { id: string; data: FixedExpenseUpdate }) => {
      const { data: result, error } = await updateFixedExpense(id, data);
      if (error) throw error;
      return result as FixedExpense | null;
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
      return data as boolean | null;
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