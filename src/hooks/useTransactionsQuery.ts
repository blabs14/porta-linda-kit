import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as transactionService from '../services/transactions';

// Hook para buscar transações
export const useTransactions = (filters?: {
  account_id?: string;
  categoria_id?: string;
  dataInicio?: string;
  dataFim?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { data, error } = await transactionService.getTransactions();
      if (error) throw error;
      
      // Aplicar filtros localmente
      let filtered = data || [];
      if (filters?.account_id && filters.account_id !== 'all') {
        filtered = filtered.filter(tx => tx.account_id === filters.account_id);
      }
      if (filters?.categoria_id && filters.categoria_id !== 'all') {
        filtered = filtered.filter(tx => tx.categoria_id === filters.categoria_id);
      }
      if (filters?.dataInicio) {
        filtered = filtered.filter(tx => tx.data >= filters.dataInicio);
      }
      if (filters?.dataFim) {
        filtered = filtered.filter(tx => tx.data <= filters.dataFim);
      }
      
      return filtered;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

// Hook para criar transação
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactionData: Parameters<typeof transactionService.createTransaction>[0]) => {
      const result = await transactionService.createTransaction(transactionData, user?.id || '');
      if (result.error) throw new Error(result.error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// Hook para atualizar transação
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await transactionService.updateTransaction(id, data, user?.id || '');
      if (result.error) throw new Error(result.error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// Hook para eliminar transação
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await transactionService.deleteTransaction(id, user?.id || '');
      if (result.error) throw new Error(result.error.message);
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