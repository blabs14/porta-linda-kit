import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { getTransactions } from '../services/transactions';
import { getGoals } from '../services/goals';

export const useDashboardData = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // Buscar todos os dados necessários para o dashboard
      const [accounts, transactions, goals] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getGoals(user?.id || '')
      ]);

      // Calcular estatísticas do dashboard
      const totalBalance = accounts.data?.reduce((sum: number, account: any) => sum + (account.saldo || 0), 0) || 0;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyTransactions = transactions.data?.filter((tx: any) => {
        const txDate = new Date(tx.data);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      }) || [];

      const monthlyIncome = monthlyTransactions
        .filter((tx: any) => tx.tipo === 'receita')
        .reduce((sum: number, tx: any) => sum + (Number(tx.valor) || 0), 0);

      const monthlyExpenses = monthlyTransactions
        .filter((tx: any) => tx.tipo === 'despesa')
        .reduce((sum: number, tx: any) => sum + (Number(tx.valor) || 0), 0);

      const activeGoals = goals.filter((goal: any) => goal.ativa !== false).length;
      const totalGoals = goals.length;

      // Calcular categorias mais usadas
      const categoryCounts = transactions.data?.reduce((acc: any, tx: any) => {
        acc[tx.categoria_id] = (acc[tx.categoria_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const topCategories = Object.entries(categoryCounts)
        .map(([categoryId, count]) => ({ category: categoryId, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      return {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        activeGoals,
        totalGoals,
        topCategories
      };
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0, // Dados sempre considerados stale para forçar refetch
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
  });
}; 