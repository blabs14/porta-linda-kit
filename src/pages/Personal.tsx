import React, { Suspense, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { PersonalProvider, usePersonal } from '../features/personal/PersonalProvider';
import { useTransactions } from '../hooks/useTransactionsQuery';
import { LoadingSpinner } from '../components/ui/loading-states';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useRouteChange } from '../hooks/useRouteChange';
import { 
  Home, 
  Wallet, 
  Target, 
  BarChart3, 
  TrendingUp, 
  Lightbulb, 
  Settings,
  Plus,
  CreditCard,
  PiggyBank,
  TrendingDown
} from 'lucide-react';
import { useMediaQuery } from '../hooks/use-mobile';

// Componentes lazy loading
const PersonalDashboard = React.lazy(() => import('../features/personal/PersonalDashboard'));
const PersonalAccounts = React.lazy(() => import('../features/personal/PersonalAccounts'));
const PersonalGoals = React.lazy(() => import('../features/personal/PersonalGoals'));
const PersonalBudgets = React.lazy(() => import('../features/personal/PersonalBudgets'));
const PersonalTransactions = React.lazy(() => import('../features/personal/PersonalTransactions'));
const PersonalInsights = React.lazy(() => import('../features/personal/PersonalInsights'));
const PersonalSettings = React.lazy(() => import('../features/personal/PersonalSettings'));

// Componente de loading
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" />
  </div>
);

// Componente de navegação mobile
const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { personalKPIs, isLoading } = usePersonal();

  const tabs = [
    { value: '/personal', label: 'Resumo', icon: Home },
    { value: '/personal/accounts', label: 'Contas', icon: Wallet },
    { value: '/personal/transactions', label: 'Transações', icon: TrendingUp },
    { value: '/personal/goals', label: 'Objetivos', icon: Target },
    { value: '/personal/budgets', label: 'Orçamentos', icon: BarChart3 },
    { value: '/personal/insights', label: 'Insights', icon: Lightbulb },
    { value: '/personal/settings', label: 'Definições', icon: Settings }
  ];

  const currentTab = tabs.find(tab => location.pathname === tab.value)?.value || '/personal';

  return (
    <div className="lg:hidden">
      <Tabs value={currentTab} onValueChange={(value) => navigate(value)}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          {tabs.slice(0, 4).map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col items-center gap-1">
              <tab.icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="grid w-full grid-cols-3">
          {tabs.slice(4).map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col items-center gap-1">
              <tab.icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

// Componente de navegação desktop
const DesktopNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/personal', label: 'Resumo', icon: Home, description: 'Visão geral pessoal' },
    { path: '/personal/accounts', label: 'Contas', icon: Wallet, description: 'Contas e cartões pessoais' },
    { path: '/personal/transactions', label: 'Transações', icon: TrendingUp, description: 'Histórico de transações' },
    { path: '/personal/goals', label: 'Objetivos', icon: Target, description: 'Metas financeiras pessoais' },
    { path: '/personal/budgets', label: 'Orçamentos', icon: BarChart3, description: 'Orçamentos mensais' },
    { path: '/personal/insights', label: 'Insights', icon: Lightbulb, description: 'Análises e dicas' },
    { path: '/personal/settings', label: 'Definições', icon: Settings, description: 'Configurações pessoais' }
  ];

  return (
    <div className="hidden lg:block w-64 bg-card border-r border-border min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Área Pessoal</h2>
        <p className="text-sm text-muted-foreground">Gestão financeira individual</p>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-xs truncate">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

// Componente de cabeçalho
const PersonalHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { personalKPIs, isLoading } = usePersonal();
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/personal') return 'Resumo';
    if (path === '/personal/accounts') return 'Contas';
    if (path === '/personal/goals') return 'Objetivos';
    if (path === '/personal/budgets') return 'Orçamentos';
    if (path === '/personal/transactions') return 'Transações';
    if (path === '/personal/insights') return 'Insights';
    if (path === '/personal/settings') return 'Definições';
    return 'Área Pessoal';
  };

  const getPrimaryAction = () => {
    const path = location.pathname;
    if (path === '/personal/goals') return { label: 'Novo Objetivo', action: () => navigate('/personal/goals/new') };
    if (path === '/personal/budgets') return { label: 'Novo Orçamento', action: () => navigate('/personal/budgets/new') };
    if (path === '/personal/transactions') return { label: 'Nova Transação', action: () => navigate('/personal/transactions/new') };
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="flex items-center justify-between p-6 border-b border-border bg-background">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/app')}
          className="flex items-center gap-2"
          title="Voltar à Home"
        >
          <Home className="h-4 w-4" />
        </Button>
        
        <div className="hidden sm:block w-px h-6 bg-border" />
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Pessoal › {getPageTitle()}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão das suas finanças pessoais
          </p>
        </div>
      </div>
      

    </div>
  );
};

// Componente de KPIs rápidos
const QuickKPIs: React.FC = () => {
  const { personalKPIs, isLoading, myGoals } = usePersonal();
  const location = useLocation();
  
  // Calcular objetivos ativos e concluídos
  const activeGoals = myGoals.filter(goal => goal.ativa).length;
  const completedGoals = myGoals.filter(goal => goal.status === 'completed').length;
  
  // Verificar se estamos na página de objetivos, orçamentos, contas ou transações
  const isGoalsPage = location.pathname === '/personal/goals';
  const isBudgetsPage = location.pathname === '/personal/budgets';
  const isAccountsPage = location.pathname === '/personal/accounts';
  const isTransactionsPage = location.pathname === '/personal/transactions';

  if (isLoading.kpis) {
    const cardCount = (isGoalsPage) ? 3 : (isBudgetsPage) ? 2 : (isAccountsPage || isTransactionsPage ? 4 : 4);
    return (
      <div className={`grid grid-cols-1 gap-4 p-6 ${(isGoalsPage) ? 'md:grid-cols-3' : (isBudgetsPage) ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        {Array.from({ length: cardCount }, (_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Se estamos na página de objetivos, mostrar 3 cards (incluindo Objetivos Ativos)
  if (isGoalsPage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Disponível - Conta Objetivos</p>
              <p className="text-2xl font-bold text-foreground">
                {personalKPIs.goalsAccountBalance.toFixed(2)}€
              </p>
            </div>
            <Target className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progresso Objetivo</p>
              <p className="text-2xl font-bold text-foreground">
                {personalKPIs.goalsProgressPercentage.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {personalKPIs.goalsAccountBalance.toFixed(2)}€ / {personalKPIs.totalGoalsValue.toFixed(2)}€
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Objetivos Ativos</p>
              <p className="text-2xl font-bold text-foreground">
                {activeGoals}
              </p>
              <p className="text-xs text-muted-foreground">
                {completedGoals} concluído{completedGoals !== 1 ? 's' : ''}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Se estamos na página de orçamentos, mostrar apenas os 2 cards específicos
  if (isBudgetsPage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Gasto - Orçamentos</p>
              <p className="text-2xl font-bold text-foreground">
                {personalKPIs.totalBudgetSpent.toFixed(2)}€
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Percentagem Gasto - Orçamentos</p>
              <p className="text-2xl font-bold text-foreground">
                {personalKPIs.budgetSpentPercentage.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {personalKPIs.totalBudgetSpent.toFixed(2)}€ / {personalKPIs.totalBudgetAmount.toFixed(2)}€
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Se estamos na página de transações, mostrar os 4 cards de métricas de transações
  if (isTransactionsPage) {
    // Usar dados das transações do contexto
    const { data: transactions = [] } = useTransactions();
    
    const totalIncome = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalExpenses = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);

    const netBalance = totalIncome - totalExpenses;
    const transactionCount = transactions.length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Receitas</p>
              <p className="text-2xl font-bold text-green-600">
                {totalIncome.toFixed(2)}€
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Despesas</p>
              <p className="text-2xl font-bold text-red-600">
                {totalExpenses.toFixed(2)}€
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Líquido</p>
              <p className="text-2xl font-bold text-blue-600">
                {netBalance.toFixed(2)}€
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Transações</p>
              <p className="text-2xl font-bold text-foreground">
                {transactionCount}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Se estamos na página de contas, mostrar apenas 3 cards (sem Objetivos Ativos)
  if (isAccountsPage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className="text-2xl font-bold text-foreground">
                {personalKPIs.totalBalance.toFixed(2)}€
              </p>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dívida Cartões</p>
              <p className="text-2xl font-bold text-destructive">
                {personalKPIs.creditCardDebt.toFixed(2)}€
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Poupança Mensal</p>
              <p className="text-2xl font-bold text-green-600">
                {personalKPIs.monthlySavings.toFixed(2)}€
              </p>
            </div>
            <PiggyBank className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  // Para outras páginas, mostrar os 4 cards originais
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <p className="text-2xl font-bold text-foreground">
              {personalKPIs.totalBalance.toFixed(2)}€
            </p>
          </div>
          <Wallet className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Dívida Cartões</p>
            <p className="text-2xl font-bold text-destructive">
              {personalKPIs.creditCardDebt.toFixed(2)}€
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-destructive" />
        </div>
      </div>
      
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Objetivos Ativos</p>
            <p className="text-2xl font-bold text-foreground">
              {activeGoals}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedGoals} concluído{completedGoals !== 1 ? 's' : ''}
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Poupança Mensal</p>
            <p className="text-2xl font-bold text-green-600">
              {personalKPIs.monthlySavings.toFixed(2)}€
            </p>
          </div>
          <PiggyBank className="h-8 w-8 text-green-600" />
        </div>
      </div>
    </div>
  );
};

// Componente principal da Área Pessoal
const PersonalArea: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const location = useLocation();
  
  // Hook para atualizar dados automaticamente quando a rota muda
  useRouteChange();

  return (
    <div className="flex h-screen bg-background">
      {/* Navegação desktop */}
      <DesktopNavigation />
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PersonalHeader />
        
        {/* KPIs rápidos (apenas em desktop) - removido apenas da página de definições */}
        {!isMobile && location.pathname !== '/personal/settings' && <QuickKPIs />}
        
        {/* Navegação mobile */}
        <MobileNavigation />
        
        {/* Conteúdo das páginas */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route index element={<PersonalDashboard />} />
              <Route path="accounts/*" element={<PersonalAccounts />} />
              <Route path="goals/*" element={<PersonalGoals />} />
              <Route path="budgets/*" element={<PersonalBudgets />} />
              <Route path="transactions/*" element={<PersonalTransactions />} />
              <Route path="insights" element={<PersonalInsights />} />
              <Route path="settings" element={<PersonalSettings />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

// Componente wrapper com provider
const PersonalPage: React.FC = () => {
  return (
    <PersonalProvider>
      <PersonalArea />
    </PersonalProvider>
  );
};

export default PersonalPage; 