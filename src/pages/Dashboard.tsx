import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Cartões de resumo - stack em mobile, grid em md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Total
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">€2.840,50</div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12% este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">€3.200,00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">€1.890,30</div>
            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3" />
              -5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Objetivos
            </CardTitle>
            <Target className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3/5</div>
            <p className="text-xs text-secondary flex items-center gap-1 mt-1">
              <Target className="h-3 w-3" />
              Em progresso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de ações rápidas */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={() => navigate('/transacoes')}
              className="flex flex-col items-center gap-2 h-auto py-4 bg-primary hover:bg-primary-dark transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Nova Transação</span>
            </Button>
            <Button 
              onClick={() => navigate('/objetivos')}
              variant="outline" 
              className="flex flex-col items-center gap-2 h-auto py-4 border-border hover:bg-accent"
            >
              <Target className="h-5 w-5 text-secondary" />
              <span className="text-sm">Novo Objetivo</span>
            </Button>
            <Button 
              onClick={() => navigate('/relatorios')}
              variant="outline" 
              className="flex flex-col items-center gap-2 h-auto py-4 border-border hover:bg-accent"
            >
              <Eye className="h-5 w-5 text-primary" />
              <span className="text-sm">Ver Relatório</span>
            </Button>
            <Button 
              onClick={() => navigate('/familia')}
              variant="outline" 
              className="flex flex-col items-center gap-2 h-auto py-4 border-border hover:bg-accent"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Gerir Família</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transações recentes e gráfico lado a lado em md+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transações recentes */}
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              Transações Recentes
            </CardTitle>
            <Button 
              onClick={() => navigate('/transacoes')}
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary-dark"
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                description: 'Supermercado Continente',
                amount: '-€45,20',
                type: 'expense',
                date: 'Hoje'
              },
              {
                description: 'Salário Janeiro',
                amount: '+€2.500,00',
                type: 'income',
                date: 'Ontem'
              },
              {
                description: 'Farmácia',
                amount: '-€12,80',
                type: 'expense',
                date: '2 dias'
              },
              {
                description: 'Transferência poupanças',
                amount: '-€200,00',
                type: 'transfer',
                date: '3 dias'
              }
            ].map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'income' 
                      ? 'bg-success/10' 
                      : transaction.type === 'expense'
                      ? 'bg-destructive/10'
                      : 'bg-primary/10'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : transaction.type === 'expense' ? (
                      <ArrowDownLeft className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.date}
                    </p>
                  </div>
                </div>
                <div className={`font-semibold text-sm ${
                  transaction.type === 'income'
                    ? 'text-success'
                    : 'text-foreground'
                }`}>
                  {transaction.amount}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gráfico de despesas por categoria */}
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { category: 'Alimentação', amount: '€520,40', percentage: 65, color: 'bg-primary' },
                { category: 'Transporte', amount: '€180,20', percentage: 25, color: 'bg-secondary' },
                { category: 'Saúde', amount: '€95,10', percentage: 15, color: 'bg-warning' },
                { category: 'Lazer', amount: '€60,30', percentage: 10, color: 'bg-destructive' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{item.category}</span>
                    <span className="text-muted-foreground">{item.amount}</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}