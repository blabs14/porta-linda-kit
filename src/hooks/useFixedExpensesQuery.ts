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
      if (error) {
        console.error('[useFixedExpenses] Error:', error);
        throw new Error(error.message || 'Erro ao buscar despesas fixas');
      }
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
      if (error) {
        console.error('[useCreateFixedExpense] Error:', error);
        throw new Error(error.message || 'Erro ao criar despesa fixa');
      }
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
      if (error) {
        console.error('[useUpdateFixedExpense] Error:', error);
        throw new Error(error.message || 'Erro ao atualizar despesa fixa');
      }
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
      if (error) {
        console.error('[useDeleteFixedExpense] Error:', error);
        throw new Error(error.message || 'Erro ao eliminar despesa fixa');
      }
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