import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgets';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useBudgets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      const { data, error } = await getBudgets();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCrudMutation(
    async (payload: { categoria_id: string; valor: number; mes: string }) => {
      const { data, error } = await createBudget({ ...payload, user_id: user?.id || '' }, user?.id || '');
      if (error) throw error;
      return data;
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
    async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateBudget(id, data, user?.id || '');
      if (error) throw error;
      return result;
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
      return data;
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