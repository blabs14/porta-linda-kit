import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2
} from 'lucide-react';
import { useTransactions } from '../hooks/useTransactionsQuery';
import { useAccountsWithBalances } from '../hooks/useAccountsQuery';
import { useGoals, useCreateGoal } from '../hooks/useGoalsQuery';
import { useCategoriesDomain } from '../hooks/useCategoriesQuery';
import { useAuth } from '../contexts/AuthContext';
import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import TransactionForm from '../components/TransactionForm';
import { useToast } from '../hooks/use-toast';
import { notifySuccess, notifyError } from '../lib/notify';
import { goalSchema } from '../validation/goalSchema';
import { ZodError } from 'zod';
import * as XLSX from 'xlsx';

// Tipo auxiliar para objetivos usados nesta página
type GoalLike = { nome?: string; valor_objetivo?: number | string | null; valor_atual?: number | string | null };

const typeColors = {
  success: 'border-success bg-success/10 text-success',
  warning: 'border-warning bg-warning/10 text-warning',
  info: 'border-primary bg-primary/10 text-primary',
  error: 'border-destructive bg-destructive/10 text-destructive'
};

type InsightType = 'success' | 'warning' | 'info' | 'error';
type InsightImpact = 'positive' | 'negative';
type IconType = React.ComponentType<{ className?: string }>; 
interface InsightItem {
  id: number;
  title: string;
  description: string;
  type: InsightType;
  impact: InsightImpact;
  icon: IconType;
  value: string;
  trend: string;
  action: string;
}

export default function Insights() {
  const { user } = useAuth();
  const transactionsQuery = useTransactions();
  const accountsQuery = useAccountsWithBalances();
  const goalsQuery = useGoals();
  const goals = useMemo(() => goalsQuery.data || [], [goalsQuery.data]);
  const goalsLoading = goalsQuery.isLoading;
  const createGoalMutation = useCreateGoal();
  const createGoal = createGoalMutation.mutateAsync;
  const isCreating = createGoalMutation.isPending;
  const categoriesQuery = useCategoriesDomain();
  
  // Memorizar resultados para estabilizar dependências de useMemo a jusante
  const transactions = useMemo(() => transactionsQuery.data || [], [transactionsQuery.data]);
  const accounts = useMemo(() => accountsQuery.data || [], [accountsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  
  const categoriesLoading = categoriesQuery.isLoading;
  const { toast } = useToast();

  const isLoading = transactionsQuery.isLoading || accountsQuery.isLoading || goalsLoading || categoriesLoading;

  const [showTxModal, setShowTxModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ nome: '', valor_objetivo: '', valor_atual: '', prazo: '' });
  const [goalErrors, setGoalErrors] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Atalho de teclado: '/' foca o botão Exportar ou o primeiro campo aberto
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        // tentar focar o primeiro input aberto (modal objetivo ou transação)
        const modalInput = document.querySelector<HTMLInputElement>('input#nome, form input');
        if (modalInput) { modalInput.focus(); return; }
        const exportBtn = document.querySelector<HTMLButtonElement>('#insights-export-btn');
        exportBtn?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Calcular insights baseados nos dados reais
  const insights = useMemo(() => {
    if (!transactions.length) return [] as InsightItem[];

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    const currentMonthTransactions = transactions.filter(tx => tx.data.startsWith(currentMonth));
    const lastMonthTransactions = transactions.filter(tx => tx.data.startsWith(lastMonth));

    const currentIncome = currentMonthTransactions
      .filter(tx => tx.tipo === 'receita')
      .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);

    const currentExpenses = currentMonthTransactions
      .filter(tx => tx.tipo === 'despesa')
      .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);

    const lastIncome = lastMonthTransactions
      .filter(tx => tx.tipo === 'receita')
      .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);

    const lastExpenses = lastMonthTransactions
      .filter(tx => tx.tipo === 'despesa')
      .reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);

    const currentSavings = Number(currentIncome) - Number(currentExpenses);
    const lastSavings = Number(lastIncome) - Number(lastExpenses);
    const savingsChange = lastSavings > 0 ? ((currentSavings - lastSavings) / lastSavings) * 100 : 0;

    const totalBalance = accounts.reduce((sum, account) => sum + (Number(account.saldo_atual) || 0), 0);

    const activeGoals = goals.filter(goal => goal.ativa);
    const goalsProgress = activeGoals.map(goal => {
      const valorAtual = Number(goal.valor_atual) || 0;
      const valorObjetivo = Number(goal.valor_objetivo) || 1;
      const progress = (valorAtual / valorObjetivo) * 100;
      return { ...goal, progress } as { progress: number } & typeof goal;
    });

    const list: InsightItem[] = [];

    // Insight sobre poupanças
    if (savingsChange > 0) {
      list.push({
        id: 1,
        title: 'Poupanças em Alta',
        description: `Conseguiu poupar ${Math.abs(savingsChange).toFixed(1)}% mais este mês comparado ao anterior`,
        type: 'success',
        impact: 'positive',
        icon: TrendingUp,
        value: `+€${currentSavings.toFixed(0)}`,
        trend: `+${savingsChange.toFixed(1)}%`,
        action: 'Manter este ritmo para atingir objetivos mais rapidamente'
      });
    } else if (savingsChange < 0) {
      list.push({
        id: 1,
        title: 'Poupanças em Baixa',
        description: `Poupanças diminuíram ${Math.abs(savingsChange).toFixed(1)}% comparado ao mês anterior`,
        type: 'warning',
        impact: 'negative',
        icon: TrendingDown,
        value: `€${currentSavings.toFixed(0)}`,
        trend: `${savingsChange.toFixed(1)}%`,
        action: 'Considere reduzir gastos desnecessários'
      });
    }

    // Insight sobre gastos por categoria
    const categoryExpenses = currentMonthTransactions
      .filter(tx => tx.tipo === 'despesa')
      .reduce((acc: Record<string, number>, tx) => {
        const category = categories.find((c) => c.id === tx.categoria_id);
        const categoryName = category?.nome || 'Outros';
        acc[categoryName] = (Number(acc[categoryName]) || 0) + (Number(tx.valor) || 0);
        return acc;
      }, {} as Record<string, number>);

    const highestExpenseCategory = Object.entries(categoryExpenses)
      .sort(([,a], [,b]) => (Number(b) - Number(a)))[0];

    if (highestExpenseCategory) {
      list.push({
        id: 2,
        title: `Gastos em ${highestExpenseCategory[0]}`,
        description: `Maior categoria de despesas este mês com €${Number(highestExpenseCategory[1]).toFixed(0)}`,
        type: 'warning',
        impact: 'negative',
        icon: TrendingDown,
        value: `€${Number(highestExpenseCategory[1]).toFixed(0)}`,
        trend: 'Alto',
        action: 'Considere analisar se estes gastos são necessários'
      });
    }

    // Insight sobre objetivos
    const nearCompletionGoal = goalsProgress.find(goal => (goal as { progress: number }).progress >= 80 && (goal as { progress: number }).progress < 100);
    if (nearCompletionGoal) {
      const g = nearCompletionGoal as GoalLike & { progress: number };
      const objetivo = Number(g.valor_objetivo ?? 0);
      const atual = Number(g.valor_atual ?? 0);
      const remaining = objetivo - atual;
      list.push({
        id: 3,
        title: 'Objetivo Quase Atingido',
        description: `Está a apenas €${Number(remaining).toFixed(0)} de completar o objetivo "${String(g.nome ?? '')}"`,
        type: 'info',
        impact: 'positive',
        icon: Target,
        value: `€${Number(remaining).toFixed(0)}`,
        trend: `${Number(g.progress).toFixed(0)}%`,
        action: 'Uma pequena poupança extra este mês completa o objetivo'
      });
    }

    // Insight sobre saldo total
    if (totalBalance > 0) {
      list.push({
        id: 4,
        title: 'Saldo Positivo',
        description: `Saldo total de todas as contas: €${totalBalance.toFixed(0)}`,
        type: 'success',
        impact: 'positive',
        icon: CheckCircle,
        value: `€${totalBalance.toFixed(0)}`,
        trend: 'Positivo',
        action: 'Excelente trabalho! Continue a gerir bem as suas finanças'
      });
    }

    return list;
  }, [transactions, accounts, goals, categories]);

  // Calcular dados de categorias para o gráfico
  const categoryData = useMemo(() => {
    if (!transactions.length || !categories.length) return [] as Array<{ name: string; amount: number; percentage: number; trend: string; color: string }>;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = transactions
      .filter((tx) => tx.data.startsWith(currentMonth) && tx.tipo === 'despesa');

    const categoryTotals = currentMonthExpenses.reduce((acc: Record<string, number>, tx) => {
      const category = categories.find((c) => c.id === tx.categoria_id);
      const categoryName = category?.nome || 'Outros';
      acc[categoryName] = (Number(acc[categoryName]) || 0) + (Number(tx.valor) || 0);
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = Object.values(categoryTotals).reduce((sum: number, val) => sum + (Number(val) || 0), 0);

    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount: Number(amount),
        percentage: Number(totalExpenses) > 0 ? Math.round((Number(amount) / Number(totalExpenses)) * 100) : 0,
        trend: '0%', // Simplificado
        color: 'bg-primary'
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categorias
  }, [transactions, categories]);

  // Calcular dados mensais
  const monthlyData = useMemo(() => {
    if (!transactions.length) return [] as Array<{ month: string; income: number; expenses: number; savings: number }>;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const last6Months: Array<{ month: string; income: number; expenses: number; savings: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentYear, new Date().getMonth() - i, 1);
      const monthStr = month.toISOString().slice(0, 7);
      
      const monthTransactions = transactions.filter((tx) => tx.data.startsWith(monthStr));
      const income = monthTransactions
        .filter((tx) => tx.tipo === 'receita')
        .reduce((sum: number, tx) => sum + (Number(tx.valor) || 0), 0);
      const expenses = monthTransactions
        .filter((tx) => tx.tipo === 'despesa')
        .reduce((sum: number, tx) => sum + (Number(tx.valor) || 0), 0);
      const savings = Number(income) - Number(expenses);

      last6Months.push({
        month: months[month.getMonth()],
        income: Number(income),
        expenses: Number(expenses),
        savings: Number(savings)
      });
    }

    return last6Months;
  }, [transactions]);

  // Função para atualizar dados
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refazer todas as queries
      await Promise.all([
        transactionsQuery.refetch(),
        accountsQuery.refetch(),
        goalsQuery.refetch(),
        categoriesQuery.refetch()
      ]);
      
      notifySuccess({ title: 'Dados atualizados', description: 'Os insights foram atualizados com sucesso!' });
    } catch (error) {
      notifyError({ title: 'Erro ao atualizar', description: 'Não foi possível atualizar os dados.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Função para exportar relatório
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const currentDate = new Date().toLocaleDateString('pt-PT');
      const fileName = `relatorio-insights-${currentDate}.xlsx`;
      
      // Preparar dados para exportação
      const exportData = {
        dataExportacao: currentDate,
        insights: insights.map(insight => ({
          titulo: insight.title,
          descricao: insight.description,
          tipo: insight.type,
          valor: insight.value,
          tendencia: insight.trend,
          acao: insight.action
        })),
        resumoFinanceiro: {
          saldoTotal: accounts.reduce((sum, account) => sum + (Number(account.saldo_atual) || 0), 0),
          totalContas: accounts.length,
          totalTransacoes: transactions.length,
          totalObjetivos: goals.length,
          objetivosAtivos: goals.filter(goal => goal.ativa).length
        },
        gastosPorCategoria: categoryData.map(cat => ({
          categoria: cat.name,
          valor: cat.amount,
          percentagem: cat.percentage
        })),
        tendenciasMensais: monthlyData.map(month => ({
          mes: month.month,
          receitas: month.income,
          despesas: month.expenses,
          poupancas: month.savings
        }))
      };

      // Criar workbook e worksheets
      const workbook = XLSX.utils.book_new();
      
      // Worksheet 1: Insights
      const insightsData = [
        ['INSIGHTS FINANCEIROS'],
        ['Data de Exportação', currentDate],
        [],
        ['Título', 'Descrição', 'Tipo', 'Valor', 'Tendência', 'Ação']
      ];
      
      exportData.insights.forEach(insight => {
        insightsData.push([
          insight.titulo,
          insight.descricao,
          insight.tipo,
          insight.valor,
          insight.tendencia,
          insight.acao
        ]);
      });
      
      const insightsSheet = XLSX.utils.aoa_to_sheet(insightsData);
      XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights');
      
      // Worksheet 2: Resumo Financeiro
      const resumoData = [
        ['RESUMO FINANCEIRO'],
        [],
        ['Métrica', 'Valor'],
        ['Saldo Total', `€${exportData.resumoFinanceiro.saldoTotal.toFixed(2)}`],
        ['Total de Contas', exportData.resumoFinanceiro.totalContas],
        ['Total de Transações', exportData.resumoFinanceiro.totalTransacoes],
        ['Total de Objetivos', exportData.resumoFinanceiro.totalObjetivos],
        ['Objetivos Ativos', exportData.resumoFinanceiro.objetivosAtivos]
      ];
      
      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
      
      // Worksheet 3: Gastos por Categoria
      const gastosData = [
        ['GASTOS POR CATEGORIA'],
        [],
        ['Categoria', 'Valor', 'Percentagem']
      ];
      
      exportData.gastosPorCategoria.forEach(cat => {
        gastosData.push([
          cat.categoria,
          `€${cat.valor.toFixed(2)}`,
          `${cat.percentagem}%`
        ]);
      });
      
      const gastosSheet = XLSX.utils.aoa_to_sheet(gastosData);
      XLSX.utils.book_append_sheet(workbook, gastosSheet, 'Gastos');
      
      // Worksheet 4: Tendências Mensais
      const tendenciasData = [
        ['TENDÊNCIAS MENSAIS (Últimos 6 meses)'],
        [],
        ['Mês', 'Receitas', 'Despesas', 'Poupanças']
      ];
      
      exportData.tendenciasMensais.forEach(month => {
        tendenciasData.push([
          month.mes,
          `€${month.receitas.toFixed(2)}`,
          `€${month.despesas.toFixed(2)}`,
          `€${month.poupancas.toFixed(2)}`
        ]);
      });
      
      const tendenciasSheet = XLSX.utils.aoa_to_sheet(tendenciasData);
      XLSX.utils.book_append_sheet(workbook, tendenciasSheet, 'Tendências');

      // Exportar ficheiro XLSX
      XLSX.writeFile(workbook, fileName);
      
      notifySuccess({ title: 'Relatório exportado', description: `O relatório foi descarregado como "${fileName}"` });
    } catch (error) {
      notifyError({ title: 'Erro ao exportar', description: 'Não foi possível exportar o relatório.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoalChange = (field: string, value: string) => {
    setGoalForm(prev => ({ ...prev, [field]: value }));
    if (goalErrors[field]) {
      setGoalErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateGoalForm = () => {
    try {
      const validationData = {
        nome: goalForm.nome,
        valor_objetivo: parseFloat(goalForm.valor_objetivo),
        prazo: goalForm.prazo || undefined
      };
      
      goalSchema.parse(validationData);
      setGoalErrors({});
      return true;
    } catch (err: unknown) {
      const newErrors: Record<string, string> = {};
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          const key = issue.path?.[0];
          if (typeof key === 'string') newErrors[key] = issue.message;
        }
      } else {
        newErrors.general = 'Erro de validação';
      }
      setGoalErrors(newErrors);
      return false;
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateGoalForm()) {
      notifyError({ title: 'Erro de validação', description: 'Por favor, corrija os erros no formulário.' });
      return;
    }

    try {
      const payload = {
        nome: goalForm.nome,
        valor_objetivo: Number(goalForm.valor_objetivo),
        prazo: goalForm.prazo,
        user_id: user?.id || ''
      };

      await createGoal(payload);
      
      notifySuccess({ title: 'Objetivo criado', description: 'O objetivo foi criado com sucesso!' });
      
      setShowGoalModal(false);
      setGoalForm({ nome: '', valor_objetivo: '', valor_atual: '', prazo: '' });
      setGoalErrors({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao criar o objetivo.';
      notifyError({ title: 'Erro ao criar objetivo', description: message });
    }
  };

  const handleGoalClose = () => {
    setShowGoalModal(false);
    setGoalForm({ nome: '', valor_objetivo: '', valor_atual: '', prazo: '' });
    setGoalErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>A carregar insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-muted-foreground">Análises inteligentes das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button id="insights-export-btn" variant="outline" size="sm" className="border-border" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* Insights principais - carrossel em mobile, grid em md+ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Insights Personalizados
        </h2>
        
        {insights.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Não há dados suficientes para gerar insights. Adicione algumas transações para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: carrossel horizontal */}
            <div className="md:hidden">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {insights.map((insight) => (
                  <Card 
                    key={insight.id} 
                    className={`flex-shrink-0 w-72 border-l-4 ${typeColors[insight.type]}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            insight.type === 'success' ? 'bg-success/10' :
                            insight.type === 'warning' ? 'bg-warning/10' :
                            insight.type === 'info' ? 'bg-primary/10' :
                            'bg-destructive/10'
                          }`}>
                            <insight.icon className={`h-5 w-5 ${
                              insight.type === 'success' ? 'text-success' :
                              insight.type === 'warning' ? 'text-warning' :
                              insight.type === 'info' ? 'text-primary' :
                              'text-destructive'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{insight.title}</h3>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {insight.trend}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground">{insight.value}</div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {insight.description}
                      </p>
                      
                      <div className="p-3 bg-accent rounded-lg">
                        <p className="text-xs font-medium text-foreground">
                          💡 {insight.action}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Desktop: grid layout */}
            <div className="hidden md:grid md:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <Card 
                  key={insight.id} 
                  className={`border-l-4 hover:shadow-lg transition-all duration-300 ${typeColors[insight.type]}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          insight.type === 'success' ? 'bg-success/10' :
                          insight.type === 'warning' ? 'bg-warning/10' :
                          insight.type === 'info' ? 'bg-primary/10' :
                          'bg-destructive/10'
                        }`}>
                          <insight.icon className={`h-5 w-5 ${
                            insight.type === 'success' ? 'text-success' :
                            insight.type === 'warning' ? 'text-warning' :
                            insight.type === 'info' ? 'text-primary' :
                            'text-destructive'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{insight.title}</h3>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {insight.trend}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-foreground">{insight.value}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {insight.description}
                    </p>
                    
                    <div className="p-3 bg-accent rounded-lg">
                      <p className="text-xs font-medium text-foreground">
                        💡 {insight.action}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Análises detalhadas - layout responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendências mensais */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tendências Mensais
            </CardTitle>
            <Button variant="ghost" size="sm" aria-label="Selecionar período de 6 meses">
              <Calendar className="h-4 w-4 mr-2" />
              6 meses
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyData.length > 0 ? (
              monthlyData.map((data, index) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">{data.month}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-success">+€{data.income.toFixed(0)}</span>
                      <span className="text-destructive">-€{data.expenses.toFixed(0)}</span>
                      <span className={`font-semibold ${data.savings >= 0 ? 'text-success' : 'text-destructive'}`}>
                        €{data.savings.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-accent rounded-full h-2">
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-success" 
                        style={{ width: `${Math.max((data.income / 5000) * 100, 5)}%` }}
                      />
                      <div 
                        className="bg-destructive" 
                        style={{ width: `${Math.max((data.expenses / 5000) * 100, 5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Não há dados suficientes para mostrar tendências mensais.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Análise por categorias */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryData.length > 0 ? (
              categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${category.color}`} />
                    <div>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.percentage}% do total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">€{category.amount.toFixed(0)}</p>
                    <div className="text-xs text-muted-foreground">
                      {category.trend}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Não há dados suficientes para mostrar gastos por categoria.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Recomendações Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Adicionar Transações</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Para obter insights mais precisos, adicione mais transações ao longo do tempo.
                  </p>
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setShowTxModal(true)}>
                    Adicionar Transação
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Definir Objetivos</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Crie objetivos financeiros para receber insights personalizados sobre o seu progresso.
                  </p>
                  <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning hover:text-warning-foreground" onClick={() => setShowGoalModal(true)}>
                    Criar Objetivo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nova Transação */}
      <Dialog open={showTxModal} onOpenChange={setShowTxModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>Adicione uma nova transação à sua conta.</DialogDescription>
          </DialogHeader>
          <TransactionForm onSuccess={() => setShowTxModal(false)} onCancel={() => setShowTxModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal Novo Objetivo */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Objetivo</DialogTitle>
            <DialogDescription>Crie um novo objetivo financeiro.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Objetivo</Label>
              <Input
                id="nome"
                value={goalForm.nome}
                onChange={(e) => handleGoalChange('nome', e.target.value)}
                placeholder="Ex: Viagem à Europa"
                className={goalErrors.nome ? 'border-red-500' : ''}
              />
              {goalErrors.nome && <p className="text-sm text-red-500">{goalErrors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_objetivo">Valor Objetivo</Label>
              <Input
                id="valor_objetivo"
                type="number"
                step="0.01"
                min="0.01"
                value={goalForm.valor_objetivo}
                onChange={(e) => handleGoalChange('valor_objetivo', e.target.value)}
                placeholder="0,00"
                className={goalErrors.valor_objetivo ? 'border-red-500' : ''}
              />
              {goalErrors.valor_objetivo && <p className="text-sm text-red-500">{goalErrors.valor_objetivo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo">Data Limite</Label>
              <Input
                id="prazo"
                type="date"
                value={goalForm.prazo}
                onChange={(e) => handleGoalChange('prazo', e.target.value)}
                className={goalErrors.prazo ? 'border-red-500' : ''}
              />
              {goalErrors.prazo && <p className="text-sm text-red-500">{goalErrors.prazo}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleGoalClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  'Criar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}