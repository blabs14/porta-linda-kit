import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgets';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';
import type { Budget, BudgetInsert, BudgetUpdate } from '../integrations/supabase/types';

export const useBudgets = () => {
  const { user } = useAuth();

  return useQuery<Budget[] | null>({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      const { data, error } = await getBudgets();
      if (error) throw error;
      return data as Budget[] | null;
    },
    enabled: !!user?.id,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCrudMutation(
    async (payload: Omit<BudgetInsert, 'user_id'>) => {
      const { data, error } = await createBudget({ ...payload, user_id: user?.id || '' } as BudgetInsert, user?.id || '');
      if (error) throw error;
      return data as Budget | null;
    },
    {
      operation: 'create',
      entityName: 'Orçamento',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] });
      },
    }
  );
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCrudMutation(
    async ({ id, data }: { id: string; data: BudgetUpdate }) => {
      const { data: result, error } = await updateBudget(id, data, user?.id || '');
      if (error) throw error;
      return result as Budget | null;
    },
    {
      operation: 'update',
      entityName: 'Orçamento',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] });
      },
    }
  );
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCrudMutation(
    async (id: string) => {
      const { data, error } = await deleteBudget(id, user?.id || '');
      if (error) throw error;
      return data as boolean | null;
    },
    {
      operation: 'delete',
      entityName: 'Orçamento',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] });
      },
    }
  );
}; 