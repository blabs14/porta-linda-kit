import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { getTransactions } from '../services/transactions';
import { getGoals } from '../services/goals';
import { getCategories } from '../services/categories';

export const useDashboardData = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Utilizador não autenticado');
      }

      try {
        // Buscar todos os dados necessários para o dashboard
        const [accountsResult, transactionsResult, goalsResult, categoriesResult] = await Promise.all([
          getAccounts(),
          getTransactions(),
          getGoals(user.id),
          getCategories()
        ]);

        if (accountsResult.error) throw accountsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;
        if (goalsResult.error) throw goalsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;

        const accounts = accountsResult.data || [];
        const transactions = transactionsResult.data || [];
        const goals = goalsResult.data || [];
        const categories = categoriesResult.data || [];

        // Calcular estatísticas do dashboard
        const totalBalance = accounts.reduce((sum, account) => sum + (Number(account.saldo) || 0), 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTransactions = transactions.filter((tx) => {
          const txDate = new Date(tx.data);
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
        });
        const monthlyIncome = monthlyTransactions
          .filter((tx) => tx.tipo === 'receita')
          .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);
        const monthlyExpenses = monthlyTransactions
          .filter((tx) => tx.tipo === 'despesa')
          .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);
        const activeGoals = goals.filter((goal) => goal.ativa !== false).length;
        const totalGoals = goals.length;
        const categoryCounts = transactions.reduce((acc, tx) => {
          const category = categories.find((cat) => cat.id === tx.categoria_id);
          const categoryName = category?.nome || 'Categoria Desconhecida';
          acc[categoryName] = (acc[categoryName] || 0) + 1;
          return acc;
        }, {});
        const topCategories = Object.entries(categoryCounts)
          .map(([categoryName, count]) => ({ category: categoryName, count: count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          activeGoals,
          totalGoals,
          topCategories
        };
      } catch (error) {
        console.error('Erro no dashboard query:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}; 