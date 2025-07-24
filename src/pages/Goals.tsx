import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar,
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Edit,
  MoreVertical
} from 'lucide-react';

const goals = [
  {
    id: 1,
    title: 'Fundo de Emergência',
    description: 'Poupança para 6 meses de despesas',
    targetAmount: 10000,
    currentAmount: 6500,
    deadline: '2024-12-31',
    category: 'Emergência',
    icon: PiggyBank,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    priority: 'Alta'
  },
  {
    id: 2,
    title: 'Entrada para Casa',
    description: 'Poupança para entrada de apartamento',
    targetAmount: 25000,
    currentAmount: 12000,
    deadline: '2025-06-30',
    category: 'Habitação',
    icon: Home,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
    priority: 'Alta'
  },
  {
    id: 3,
    title: 'Carro Novo',
    description: 'Substituir carro atual',
    targetAmount: 15000,
    currentAmount: 8500,
    deadline: '2024-09-15',
    category: 'Transporte',
    icon: Car,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    priority: 'Média'
  },
  {
    id: 4,
    title: 'Férias Europa',
    description: 'Viagem de 2 semanas pela Europa',
    targetAmount: 3000,
    currentAmount: 1800,
    deadline: '2024-07-01',
    category: 'Viagem',
    icon: Plane,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    priority: 'Baixa'
  },
  {
    id: 5,
    title: 'Formação Profissional',
    description: 'Curso de especialização',
    targetAmount: 2500,
    currentAmount: 500,
    deadline: '2024-04-30',
    category: 'Educação',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    priority: 'Média'
  }
];

const priorityColors = {
  'Alta': 'bg-destructive text-destructive-foreground',
  'Média': 'bg-warning text-warning-foreground',
  'Baixa': 'bg-success text-success-foreground'
};

export default function Goals() {
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const completedGoals = goals.filter(goal => goal.currentAmount >= goal.targetAmount).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objetivos</h1>
          <p className="text-muted-foreground">Acompanhe o progresso das suas metas financeiras</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark shadow-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Objetivo
        </Button>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Poupado</p>
                <p className="text-2xl font-bold text-foreground">€{totalSaved.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <PiggyBank className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta Total</p>
                <p className="text-2xl font-bold text-foreground">€{totalTarget.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Target className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-foreground">{completedGoals}/{goals.length}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de objetivos - stack em mobile, grid responsivo em md+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const remaining = goal.targetAmount - goal.currentAmount;
          const daysUntilDeadline = Math.ceil(
            (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <Card key={goal.id} className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${goal.bgColor}`}>
                      <goal.icon className={`h-6 w-6 ${goal.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-foreground mb-1">
                        {goal.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mb-2">
                        {goal.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {goal.category}
                        </Badge>
                        <Badge className={`text-xs ${priorityColors[goal.priority as keyof typeof priorityColors]}`}>
                          {goal.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progresso */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      €{goal.currentAmount.toLocaleString()} / €{goal.targetAmount.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Falta Poupar</p>
                    <p className="font-semibold text-sm text-foreground">
                      €{remaining.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                    <p className={`font-semibold text-sm flex items-center gap-1 ${
                      daysUntilDeadline < 30 ? 'text-destructive' : 
                      daysUntilDeadline < 90 ? 'text-warning' : 'text-foreground'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      {daysUntilDeadline} dias
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary-dark">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                  <Button variant="outline" size="sm" className="border-border">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Call to action se não há objetivos */}
      {goals.length === 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ainda não tem objetivos definidos
            </h3>
            <p className="text-muted-foreground mb-6">
              Defina metas financeiras para organizar melhor as suas poupanças
            </p>
            <Button className="bg-primary hover:bg-primary-dark">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Objetivo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}