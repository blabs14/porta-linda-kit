import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getCategories } from '../services/categories';
import { getAccounts } from '../services/accounts';
import { getTransactions } from '../services/transactions';

// Hook para dados de referência (categorias e contas)
export const useReferenceData = () => {
  const { user } = useAuth();

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await getCategories();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await getAccounts();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    categories,
    accounts,
  };
};

// Hook para queries frequentes (otimizado para performance)
export const useFrequentQueries = () => {
  const { user } = useAuth();

  const recentTransactions = useQuery({
    queryKey: ['frequent-recent-transactions'],
    queryFn: async () => {
      const { data, error } = await getTransactions();
      if (error) throw error;
      
      // Retornar apenas as 5 transações mais recentes
      const sorted = (data || []).sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      return sorted.slice(0, 5);
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minuto para dados frequentes
  });

  const transactionStats = useQuery({
    queryKey: ['frequent-transaction-stats'],
    queryFn: async () => {
      const { data, error } = await getTransactions();
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

      return {
        monthlyIncome: income,
        monthlyExpenses: expenses,
        balance: income - expenses,
        transactionCount: monthlyTransactions.length,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos para estatísticas
  });

  return {
    recentTransactions,
    transactionStats,
  };
}; 