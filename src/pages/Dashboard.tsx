import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/loading-states';
import { useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactionsQuery';
import { useReferenceData } from '../hooks/useCache';
import { useGoals } from '../hooks/useGoalsQuery';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Users
} from 'lucide-react';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  activeGoals: number;
  totalGoals: number;
  topCategories: any[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Usar TanStack Query hooks
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { categories } = useReferenceData();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  
  const loading = transactionsLoading || categories.isLoading || goalsLoading;

  // Calcular dados do dashboard com useMemo
  const dashboardData = useMemo(() => {
    if (!transactions.length || !categories.data || !goals) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        activeGoals: 0,
        totalGoals: 0,
        topCategories: []
      };
    }
    
    // Calcular estatísticas
    const totalIncome = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    
    const totalExpenses = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    
    const totalBalance = totalIncome - totalExpenses;
    
    // Top categorias
    const categoryStats = transactions.reduce((acc, t) => {
      const category = categories.data?.find(c => c.id === t.categoria_id)?.nome || 'Sem categoria';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategories = Object.entries(categoryStats)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return {
      totalBalance,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      activeGoals: goals.filter(g => g.ativa).length,
      totalGoals: goals.length,
      topCategories
    };
  }, [transactions, categories.data, goals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getBalanceChange = () => {
    const change = dashboardData.monthlyIncome - dashboardData.monthlyExpenses;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      percentage: dashboardData.monthlyIncome > 0 ? (change / dashboardData.monthlyIncome) * 100 : 0
    };
  };

  const balanceChange = getBalanceChange();

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/transactions')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {balanceChange.isPositive ? '+' : '-'}{formatCurrency(balanceChange.value)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Receitas Mensais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Mensais</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboardData.monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(dashboardData.monthlyIncome)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Despesas Mensais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dashboardData.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              -{formatCurrency(dashboardData.monthlyExpenses)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.activeGoals} de {dashboardData.totalGoals} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/transactions')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Ver Transações</h3>
                <p className="text-sm text-muted-foreground">Gerir todas as transações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/accounts')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Gerir Contas</h3>
                <p className="text-sm text-muted-foreground">Ver e editar contas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/goals')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Objetivos</h3>
                <p className="text-sm text-muted-foreground">Acompanhar metas financeiras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categorias Mais Usadas */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias Mais Usadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.topCategories.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium">{String(category.category)}</span>
                <span className="text-sm text-muted-foreground">{category.count} transações</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}