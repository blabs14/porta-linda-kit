import { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  Target,
  Users,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactionsQuery';
import { useAccountsDomain } from '../hooks/useAccountsQuery';
import { useCategoriesDomain } from '../hooks/useCategoriesQuery';
import { useGoals } from '../hooks/useGoalsQuery';
const LazyReportExport = lazy(() => import('../components/ReportExport').then(m => ({ default: m.ReportExport })));
const LazyReportChart = lazy(() => import('../components/ReportChart').then(m => ({ default: m.default })));
import { formatCurrency } from '../lib/utils';

const ReportsPage = () => {
  const { user } = useAuth();
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccountsDomain();
  const { data: categories = [] } = useCategoriesDomain();
  const { data: goals = [] } = useGoals();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [reportType, setReportType] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [excludeTransfers, setExcludeTransfers] = useState(true);

  // Ajustar automaticamente o período quando o tipo muda
  useEffect(() => {
    const now = new Date();
    if (reportType === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRange({ start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) });
    } else if (reportType === 'quarterly') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      setDateRange({ start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) });
    } else if (reportType === 'yearly') {
      const start = new Date(now.getFullYear(), 0, 1);
      setDateRange({ start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) });
    }
  }, [reportType]);

  // Atalho de teclado: '/' foca a Data Início
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('#reports-start-date');
        el?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Filtrar transações baseado nos filtros (memoizado)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.data);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      if (transactionDate < startDate || transactionDate > endDate) return false;
      if (selectedCategory !== 'all' && transaction.categoria_id !== selectedCategory) return false;
      if (selectedAccount !== 'all' && transaction.account_id !== selectedAccount) return false;
      if (excludeTransfers && transaction.tipo === 'transferencia') return false;
      
      return true;
    });
  }, [transactions, dateRange.start, dateRange.end, selectedCategory, selectedAccount, excludeTransfers]);

  // Calcular métricas (memoizado)
  const { totalIncome, totalExpenses, netBalance, transactionCount } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);
    const expenses = filteredTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Despesas por categoria (memoizado) — inclui id da categoria para drill-down
  const expensesByCategory = useMemo(() => {
    return categories.map(category => {
      const categoryExpenses = filteredTransactions
        .filter(t => t.tipo === 'despesa' && t.categoria_id === category.id)
        .reduce((sum, t) => sum + t.valor, 0);
      
      return {
        id: category.id,
        categoria: category.nome,
        total: categoryExpenses,
        percentage: totalExpenses > 0 ? (categoryExpenses / totalExpenses) * 100 : 0
      };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  }, [categories, filteredTransactions, totalExpenses]);

  // Receitas por categoria (memoizado)
  const incomeByCategory = useMemo(() => {
    return categories.map(category => {
      const categoryIncome = filteredTransactions
        .filter(t => t.tipo === 'receita' && t.categoria_id === category.id)
        .reduce((sum, t) => sum + t.valor, 0);
      
      return {
        id: category.id,
        categoria: category.nome,
        total: categoryIncome,
        percentage: totalIncome > 0 ? (categoryIncome / totalIncome) * 100 : 0
      };
    }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  }, [categories, filteredTransactions, totalIncome]);

  // Evolução mensal (mantém filtro de transferências, memoizado)
  const monthlyEvolution = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStr = month.toISOString().slice(0, 7);
      
      const monthTransactions = transactions.filter(t => t.data.startsWith(monthStr) && (!excludeTransfers || t.tipo !== 'transferencia'));
      const monthIncome = monthTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + t.valor, 0);
      const monthExpenses = monthTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + t.valor, 0);
      
      return {
        key: monthStr,
        month: month.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }),
        year: month.getFullYear(),
        monthIndex: month.getMonth(),
        income: monthIncome,
        expenses: monthExpenses,
        balance: monthIncome - monthExpenses
      };
    }).reverse();
  }, [transactions, excludeTransfers]);

  const handleExport = async (format: string, customDateRange?: { start: string; end: string }) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { exportReport } = await import('../services/exportService');
      const exportDateRange = customDateRange || dateRange;
      
      const { blob, filename } = await exportReport(user.id, {
        format: format as 'pdf' | 'csv' | 'excel',
        dateRange: exportDateRange
      });
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    // Forçar refresh dos dados
    window.location.reload();
  };

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory)?.nome || null;
  }, [categories, selectedCategory]);

  const selectedAccountName = useMemo(() => {
    if (selectedAccount === 'all') return null;
    return accounts.find(a => a.id === selectedAccount)?.name || null;
  }, [accounts, selectedAccount]);

  // Helpers de drill-down
  const setMonthRange = (year: number, monthIndex: number) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    setDateRange({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) });
    setReportType('custom');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada das suas finanças
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Suspense fallback={<div className="h-9 w-24 rounded bg-muted animate-pulse" aria-label="A carregar exportador..." />}> 
            <LazyReportExport onExport={handleExport} />
          </Suspense>
        </div>
      </div>

      {/* Filtros */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                id="reports-start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Conta</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={excludeTransfers} onChange={(e) => setExcludeTransfers(e.target.checked)} />
                Excluir transferências
              </label>
            </div>
          </div>

          {/* Resumo dos filtros */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {filteredTransactions.length} transações encontradas
            </Badge>
            <Badge variant="outline">
              {new Date(dateRange.start).toLocaleDateString('pt-PT')} - {new Date(dateRange.end).toLocaleDateString('pt-PT')}
            </Badge>
            {excludeTransfers && (
              <Badge variant="outline">Sem transferências</Badge>
            )}
            {selectedCategoryName && (
              <Badge variant="outline">Categoria: {selectedCategoryName}</Badge>
            )}
            {selectedAccountName && (
              <Badge variant="outline">Conta: {selectedAccountName}</Badge>
            )}
            {(selectedAccount !== 'all' || selectedCategory !== 'all' || excludeTransfers || reportType !== 'monthly') && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedAccount('all'); setSelectedCategory('all'); setExcludeTransfers(true); setReportType('monthly'); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold">{transactionCount}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Relatórios */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="evolution" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objetivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Despesas por Categoria */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length > 0 ? (
                  <div className="space-y-3">
                    {expensesByCategory.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedCategory(item.id); setActiveTab('categories'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedCategory(item.id); setActiveTab('categories'); } }}
                        className="flex items-center justify-between focus:outline-none focus:ring-2 rounded p-1"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm font-medium">{item.categoria}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
                )}
              </CardContent>
            </Card>

            {/* Gráficos (Bar + Pie) */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Resumo Gráfico</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] w-full rounded bg-muted animate-pulse" aria-label="A carregar gráficos..." />}> 
                  <LazyReportChart data={expensesByCategory.map(({ categoria, total }) => ({ categoria, total }))} />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Análise Detalhada por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map(category => {
                  const categoryExpenses = filteredTransactions
                    .filter(t => t.tipo === 'despesa' && t.categoria_id === category.id)
                    .reduce((sum, t) => sum + t.valor, 0);
                  
                  const categoryIncome = filteredTransactions
                    .filter(t => t.tipo === 'receita' && t.categoria_id === category.id)
                    .reduce((sum, t) => sum + t.valor, 0);
                  
                  const categoryBalance = categoryIncome - categoryExpenses;
                  
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-medium">{category.nome}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-green-600">+{formatCurrency(categoryIncome)}</div>
                          <div className="text-xs text-muted-foreground">Receitas</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600">-{formatCurrency(categoryExpenses)}</div>
                          <div className="text-xs text-muted-foreground">Despesas</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${categoryBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(categoryBalance)}
                          </div>
                          <div className="text-xs text-muted-foreground">Saldo</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyEvolution.map((m, index) => (
                  <div
                    key={m.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setMonthRange(m.year, m.monthIndex)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setMonthRange(m.year, m.monthIndex); }}
                    className="flex items-center justify-between p-3 border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <div className="font-medium">{m.month}</div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-green-600">+{formatCurrency(m.income)}</div>
                        <div className="text-xs text-muted-foreground">Receitas</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-red-600">-{formatCurrency(m.expenses)}</div>
                        <div className="text-xs text-muted-foreground">Despesas</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${m.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(m.balance)}
                        </div>
                        <div className="text-xs text-muted-foreground">Saldo</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Progresso dos Objetivos</CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <div className="space-y-4">
                  {goals.map(goal => {
                    const progress = ((goal.valor_atual || 0) / (goal.valor_objetivo || 1)) * 100;
                    return (
                      <div key={goal.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{goal.nome}</span>
                          <Badge variant={progress >= 100 ? 'default' : 'secondary'}>
                            {progress.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatCurrency(goal.valor_atual || 0)} / {formatCurrency(goal.valor_objetivo)}
                          </span>
                          <span className="text-muted-foreground">
                            Restante: {formatCurrency((goal.valor_objetivo || 0) - (goal.valor_atual || 0))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum objetivo encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage; 