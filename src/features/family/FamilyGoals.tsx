import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { Target, CheckCircle } from 'lucide-react';

const FamilyGoals: React.FC = () => {
  const { familyGoals, isLoading } = useFamily();

  if (isLoading.goals) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeGoals = familyGoals.filter(goal => goal.ativa);
  const completedGoals = familyGoals.filter(goal => !goal.ativa);

  return (
    <div className="p-6 space-y-6">
      {/* Objetivos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos Ativos
          </CardTitle>
          <CardDescription>
            Metas financeiras em progresso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum objetivo ativo encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGoals.map((goal) => {
                const progress = ((goal.valor_atual || 0) / (goal.valor_objetivo || 1)) * 100;
                const isCompleted = progress >= 100;
                
                return (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{goal.nome}</h3>
                        {isCompleted && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-green-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Atual:</span>
                            <span className="font-medium">{formatCurrency(goal.valor_atual || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Meta:</span>
                            <span className="font-medium">{formatCurrency(goal.valor_objetivo)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Restante:</span>
                            <span className="font-medium">
                              {formatCurrency(Math.max(0, goal.valor_objetivo - (goal.valor_atual || 0)))}
                            </span>
                          </div>
                        </div>
                        
                        {goal.prazo && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Prazo:</span>
                              <span className="font-medium">
                                {new Date(goal.prazo).toLocaleDateString('pt-PT')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objetivos Concluídos */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Objetivos Concluídos
            </CardTitle>
            <CardDescription>
              Metas financeiras já alcançadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="hover:shadow-md transition-shadow bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{goal.nome}</h3>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-green-600">100%</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Alcançado:</span>
                          <span className="font-medium">{formatCurrency(goal.valor_atual || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Meta:</span>
                          <span className="font-medium">{formatCurrency(goal.valor_objetivo)}</span>
                        </div>
                      </div>
                      
                      {goal.prazo && (
                        <div className="pt-2 border-t border-green-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Concluído em:</span>
                            <span className="font-medium">
                              {new Date(goal.prazo).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilyGoals; 