import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardQuery';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>A carregar dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p>Erro ao carregar dados do dashboard</p>
          <p className="text-sm text-muted-foreground">Tente recarregar a página</p>
        </div>
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
    const change = dashboardData?.monthlyIncome - dashboardData?.monthlyExpenses;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      percentage: dashboardData?.monthlyIncome > 0 ? (change / dashboardData?.monthlyIncome) * 100 : 0
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
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
        {/* Saldo Total */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate flex-1 mr-2">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.totalBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {balanceChange.isPositive ? '+' : '-'}{formatCurrency(balanceChange.value)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Receitas Mensais */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate flex-1 mr-2">Receitas Mensais</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboardData?.monthlyIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(dashboardData?.monthlyIncome || 0)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Despesas Mensais */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate flex-1 mr-2">Despesas Mensais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dashboardData?.monthlyExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              -{formatCurrency(dashboardData?.monthlyExpenses || 0)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate flex-1 mr-2">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.activeGoals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.activeGoals || 0} de {dashboardData?.totalGoals || 0} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
        <Card className="cursor-pointer hover:shadow-md transition-shadow h-fit" onClick={() => navigate('/app/transactions')}>
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

        <Card className="cursor-pointer hover:shadow-md transition-shadow h-fit" onClick={() => navigate('/app/accounts')}>
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

        <Card className="cursor-pointer hover:shadow-md transition-shadow h-fit" onClick={() => navigate('/app/goals')}>
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
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Categorias Mais Usadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.topCategories?.map((category, index) => (
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