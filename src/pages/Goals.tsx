import { useEffect, useState } from 'react';
import { getGoals } from '../services/goals';
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

const iconMap: Record<string, any> = {
  'Emergência': PiggyBank,
  'Habitação': Home,
  'Transporte': Car,
  'Viagem': Plane,
  'Educação': GraduationCap,
};

const priorityColors = {
  'Alta': 'bg-destructive text-destructive-foreground',
  'Média': 'bg-warning text-warning-foreground',
  'Baixa': 'bg-success text-success-foreground'
};

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      const { data } = await getGoals();
      setGoals(data || []);
      setLoading(false);
    };
    fetchGoals();
  }, []);

  const totalSaved = goals.reduce((sum, goal) => sum + (goal.valor_atual || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + (goal.valor_objetivo || 0), 0);
  const completedGoals = goals.filter(goal => (goal.valor_atual || 0) >= (goal.valor_objetivo || 0)).length;

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

      {/* Lista de objetivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="text-center col-span-2">A carregar...</div>
        ) : goals.length === 0 ? (
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
        ) : goals.map((goal) => {
          const progress = (goal.valor_atual / goal.valor_objetivo) * 100;
          const remaining = (goal.valor_objetivo || 0) - (goal.valor_atual || 0);
          const daysUntilDeadline = goal.prazo ? Math.ceil(
            (new Date(goal.prazo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ) : null;
          const Icon = iconMap[goal.categoria] || PiggyBank;
          return (
            <Card key={goal.id} className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg bg-primary/10`}>
                      <Icon className={`h-6 w-6 text-primary`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-foreground mb-1">
                        {goal.nome}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mb-2">
                        {goal.descricao}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {goal.categoria || 'Sem categoria'}
                        </Badge>
                        <Badge className={`text-xs ${priorityColors[goal.status as keyof typeof priorityColors] || ''}`}>
                          {goal.status || 'Sem prioridade'}
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
                      €{(goal.valor_atual || 0).toLocaleString()} / €{(goal.valor_objetivo || 0).toLocaleString()}
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
                      daysUntilDeadline !== null && daysUntilDeadline < 30 ? 'text-destructive' : 
                      daysUntilDeadline !== null && daysUntilDeadline < 90 ? 'text-warning' : 'text-foreground'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      {daysUntilDeadline !== null ? `${daysUntilDeadline} dias` : 'Sem prazo'}
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
    </div>
  );
}