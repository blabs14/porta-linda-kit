import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as transactionService from '../services/transactions';

// Hook para buscar transações
export const useTransactions = () => {
  const { user } = useAuth();
  
  console.log('[useTransactions] Hook called with user:', user?.id);
  
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      console.log('[useTransactions] Query function called');
      const { data, error } = await transactionService.getTransactions();
      if (error) {
        console.error('[useTransactions] Error:', error);
        throw new Error(error.message || 'Erro ao buscar transações');
      }
      console.log('[useTransactions] Query result:', data?.length || 0, 'transactions');
      return data || [];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0, // Dados sempre considerados stale para forçar refetch
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
  });
};

// Hook para criar transação
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactionData: Parameters<typeof transactionService.createTransaction>[0]) => {
      console.log('[useCreateTransaction] Mutation function called with data:', transactionData);
      const result = await transactionService.createTransaction(transactionData, user?.id || '');
      console.log('[useCreateTransaction] Service result:', result);
      if (result.error) {
        console.error('[useCreateTransaction] Error:', result.error);
        throw new Error(result.error.message || 'Erro ao criar transação');
      }
      return result.data;
    },
    onSuccess: (data) => {
      console.log('[useCreateTransaction] onSuccess called with data:', data);
      console.log('[useCreateTransaction] Invalidating transactions query...');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      console.log('[useCreateTransaction] Invalidating accountsWithBalances query...');
      queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      console.log('[useCreateTransaction] Invalidation complete');
    },
    onError: (error) => {
      console.error('[useCreateTransaction] onError called with error:', error);
    }
  });
};

// Hook para atualizar transação
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log('[useUpdateTransaction] Mutation function called with id:', id, 'data:', data);
      const result = await transactionService.updateTransaction(id, data, user?.id || '');
      console.log('[useUpdateTransaction] Service result:', result);
      if (result.error) {
        console.error('[useUpdateTransaction] Error:', result.error);
        throw new Error(result.error.message || 'Erro ao atualizar transação');
      }
      return result.data;
    },
    onSuccess: (data) => {
      console.log('[useUpdateTransaction] onSuccess called with data:', data);
      console.log('[useUpdateTransaction] Invalidating transactions query...');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      console.log('[useUpdateTransaction] Invalidating accountsWithBalances query...');
      queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      console.log('[useUpdateTransaction] Invalidation complete');
    },
    onError: (error) => {
      console.error('[useUpdateTransaction] onError called with error:', error);
    }
  });
};

// Hook para eliminar transação
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await transactionService.deleteTransaction(id, user?.id || '');
      if (result.error) {
        console.error('[useDeleteTransaction] Error:', result.error);
        throw new Error(result.error.message || 'Erro ao eliminar transação');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// Hook para transações recentes (otimizado para dashboard)
export const useRecentTransactions = (limit: number = 5) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-transactions', limit],
    queryFn: async () => {
      const { data, error } = await transactionService.getTransactions();
      if (error) throw error;
      
      // Ordenar por data e pegar as mais recentes
      const sorted = (data || []).sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      
      return sorted.slice(0, limit);
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minuto para dados recentes
  });
};

// Hook para estatísticas de transações
export const useTransactionStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => {
      const { data, error } = await transactionService.getTransactions();
      if (error) throw error;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyTransactions = (data || []).filter(tx => {
        const txDate = new Date(tx.data);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });

      const income = monthlyTransactions
        .filter(tx => tx.tipo === 'receita')
        .reduce((sum, tx) => sum + Number(tx.valor), 0);

      const expenses = monthlyTransactions
        .filter(tx => tx.tipo === 'despesa')
        .reduce((sum, tx) => sum + Number(tx.valor), 0);

      const balance = income - expenses;

      return {
        monthlyIncome: income,
        monthlyExpenses: expenses,
        balance,
        transactionCount: monthlyTransactions.length,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos para estatísticas
  });
}; 