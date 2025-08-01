import React from 'react';
import { usePersonal } from './PersonalProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Target, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-states';

const PersonalGoals: React.FC = () => {
  const { myGoals, isLoading, deletePersonalGoal } = usePersonal();

  if (isLoading.goals) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem a certeza que pretende eliminar este objetivo?')) {
      await deletePersonalGoal(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objetivos Pessoais
              </CardTitle>
              <CardDescription>
                Suas metas financeiras e objetivos de poupança
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Objetivo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum objetivo pessoal encontrado</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro objetivo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGoals.map((goal) => {
                const progress = goal.valor_objetivo > 0 
                  ? ((goal.valor_atual || 0) / goal.valor_objetivo) * 100 
                  : 0;
                
                return (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">{goal.nome}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Progresso
                          </span>
                          <Badge variant={progress >= 100 ? "default" : "secondary"}>
                            {progress.toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {(goal.valor_atual || 0).toFixed(2)}€
                          </p>
                          <p className="text-sm text-muted-foreground">
                            de {goal.valor_objetivo.toFixed(2)}€
                          </p>
                        </div>
                        
                        {goal.prazo && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Prazo: {new Date(goal.prazo).toLocaleDateString('pt-PT')}</span>
                          </div>
                        )}
                        
                        <Badge variant="outline" className="text-xs">
                          Pessoal
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalGoals; 