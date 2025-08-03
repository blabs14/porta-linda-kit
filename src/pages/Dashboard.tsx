import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardQuery';
import { useAccountsWithBalances } from '../hooks/useAccountsQuery';
import { useTransactions } from '../hooks/useTransactionsQuery';
import { useGoals } from '../hooks/useGoalsQuery';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, error } = useDashboardData();
  const { data: accounts = [] } = useAccountsWithBalances();
  const { data: transactions = [] } = useTransactions();
  const { goals = [] } = useGoals();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

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

  const getBalanceChange = () => {
    const change = (dashboardData?.monthlyIncome || 0) - (dashboardData?.monthlyExpenses || 0);
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      percentage: (dashboardData?.monthlyIncome || 0) > 0 ? (change / (dashboardData?.monthlyIncome || 1)) * 100 : 0
    };
  };

  const balanceChange = getBalanceChange();

  // Calcular métricas adicionais
  const totalAccounts = accounts.length;
  const activeGoals = goals.filter(goal => goal.status === 'active').length;
  const recentTransactions = transactions.slice(0, 5);
  
  // Calcular distribuição de saldos por conta
  const accountDistribution = accounts.map(account => ({
    name: account.nome,
    balance: account.saldo_atual || 0,
    percentage: ((account.saldo_atual || 0) / (dashboardData?.totalBalance || 1)) * 100
  }));

  // Verificar se há dados para mostrar
  const hasData = dashboardData && (
    dashboardData.totalBalance > 0 || 
    dashboardData.monthlyIncome > 0 || 
    dashboardData.monthlyExpenses > 0 || 
    totalAccounts > 0
  );

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
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {selectedPeriod === 'month' ? 'Este Mês' : 'Este Ano'}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Total */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.totalBalance || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {balanceChange.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              {balanceChange.isPositive ? '+' : '-'}{formatCurrency(balanceChange.value)} este mês
            </div>
          </CardContent>
        </Card>

        {/* Receitas Mensais */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Mensais</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboardData?.monthlyIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{formatCurrency(dashboardData?.monthlyIncome || 0)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Despesas Mensais */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dashboardData?.monthlyExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              -{formatCurrency(dashboardData?.monthlyExpenses || 0)} este mês
            </p>
          </CardContent>
        </Card>

        {/* Objetivos Ativos */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos Ativos</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeGoals > 0 ? `${activeGoals} objetivos em progresso` : 'Nenhum objetivo ativo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Contas */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accountDistribution.length > 0 ? (
              <div className="space-y-3">
                {accountDistribution
                  .filter(account => account.balance > 0)
                  .sort((a, b) => b.balance - a.balance)
                  .slice(0, 5)
                  .map((account, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">{account.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(account.balance)}</div>
                        <div className="text-xs text-muted-foreground">{account.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/app/accounts')}
                >
                  Criar Conta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transações Recentes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium">{transaction.descricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.data).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'receita' ? '+' : '-'}{formatCurrency(transaction.valor)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/personal/transactions')}
                >
                  Criar Transação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/personal/transactions')}
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">Nova Transação</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/app/accounts')}
            >
              <Wallet className="h-6 w-6" />
              <span className="text-sm">Gerir Contas</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/app/goals')}
            >
              <Target className="h-6 w-6" />
              <span className="text-sm">Objetivos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/app/insights')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estado do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total de Contas</p>
                <p className="text-2xl font-bold">{totalAccounts}</p>
              </div>
              <Badge variant="secondary">{totalAccounts > 0 ? 'Ativo' : 'Inativo'}</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Transações Este Mês</p>
                <p className="text-2xl font-bold">{transactions.filter(t => 
                  new Date(t.data).getMonth() === new Date().getMonth()
                ).length}</p>
              </div>
              <Badge variant="outline">Mensal</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado do Sistema</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}