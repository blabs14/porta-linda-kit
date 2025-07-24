import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowDownLeft
} from 'lucide-react';

const insights = [
  {
    id: 1,
    title: 'Poupanças em Alta',
    description: 'Conseguiu poupar 15% mais este mês comparado ao anterior',
    type: 'success',
    impact: 'positive',
    icon: TrendingUp,
    value: '+€320',
    trend: '+15%',
    action: 'Manter este ritmo para atingir objetivos mais rapidamente'
  },
  {
    id: 2,
    title: 'Gastos em Alimentação',
    description: 'Despesas alimentares subiram 22% comparado à média dos últimos 3 meses',
    type: 'warning',
    impact: 'negative',
    icon: TrendingDown,
    value: '€580',
    trend: '+22%',
    action: 'Considere planear refeições para reduzir custos'
  },
  {
    id: 3,
    title: 'Objetivo Quase Atingido',
    description: 'Está a apenas €200 de completar o objetivo "Fundo de Emergência"',
    type: 'info',
    impact: 'positive',
    icon: Target,
    value: '€200',
    trend: '98%',
    action: 'Uma pequena poupança extra este mês completa o objetivo'
  },
  {
    id: 4,
    title: 'Melhor Mês do Ano',
    description: 'Este foi o seu melhor mês em termos de balanço receitas vs despesas',
    type: 'success',
    impact: 'positive',
    icon: CheckCircle,
    value: '+€1.240',
    trend: 'Recorde',
    action: 'Excelente trabalho! Continue assim'
  }
];

const categories = [
  { name: 'Alimentação', amount: 580, percentage: 35, trend: '+22%', color: 'bg-destructive' },
  { name: 'Transporte', amount: 240, percentage: 15, trend: '-5%', color: 'bg-warning' },
  { name: 'Habitação', amount: 800, percentage: 48, trend: '0%', color: 'bg-primary' },
  { name: 'Lazer', amount: 120, percentage: 7, trend: '+10%', color: 'bg-secondary' },
  { name: 'Saúde', amount: 95, percentage: 6, trend: '-15%', color: 'bg-success' }
];

const monthlyData = [
  { month: 'Set', income: 2800, expenses: 1950, savings: 850 },
  { month: 'Out', income: 2900, expenses: 2100, savings: 800 },
  { month: 'Nov', income: 2750, expenses: 1850, savings: 900 },
  { month: 'Dez', income: 3200, expenses: 2400, savings: 800 },
  { month: 'Jan', income: 3100, expenses: 1860, savings: 1240 }
];

const typeColors = {
  success: 'border-success bg-success/10 text-success',
  warning: 'border-warning bg-warning/10 text-warning',
  info: 'border-primary bg-primary/10 text-primary',
  error: 'border-destructive bg-destructive/10 text-destructive'
};

export default function Insights() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-muted-foreground">Análises inteligentes das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Insights principais - carrossel em mobile, grid em md+ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Insights Personalizados
        </h2>
        
        {/* Mobile: carrossel horizontal */}
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {insights.map((insight) => (
              <Card 
                key={insight.id} 
                className={`flex-shrink-0 w-72 border-l-4 ${typeColors[insight.type as keyof typeof typeColors]}`}
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
              className={`border-l-4 hover:shadow-lg transition-all duration-300 ${typeColors[insight.type as keyof typeof typeColors]}`}
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

      {/* Análises detalhadas - layout responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendências mensais */}
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tendências Mensais
            </CardTitle>
            <Button variant="ghost" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              6 meses
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">{data.month}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-success">+€{data.income}</span>
                    <span className="text-destructive">-€{data.expenses}</span>
                    <span className="font-semibold text-foreground">€{data.savings}</span>
                  </div>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-success" 
                      style={{ width: `${(data.income / 3500) * 100}%` }}
                    />
                    <div 
                      className="bg-destructive" 
                      style={{ width: `${(data.expenses / 3500) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Análise por categorias */}
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.percentage}% do total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">€{category.amount}</p>
                  <div className={`text-xs flex items-center gap-1 ${
                    category.trend.startsWith('+') ? 'text-destructive' : 
                    category.trend.startsWith('-') ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {category.trend.startsWith('+') ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : category.trend.startsWith('-') ? (
                      <ArrowDownLeft className="h-3 w-3" />
                    ) : null}
                    {category.trend}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card className="bg-gradient-card shadow-md">
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
                  <h4 className="font-semibold text-foreground mb-1">Optimizar Poupanças</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Com base no seu padrão atual, pode poupar mais €150/mês reduzindo gastos em alimentação.
                  </p>
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Controlar Gastos</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Os gastos em lazer aumentaram 30% nos últimos 2 meses. Considere definir um limite mensal.
                  </p>
                  <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning hover:text-warning-foreground">
                    Definir Limite
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}