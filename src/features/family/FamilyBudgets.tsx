import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { BarChart3, AlertTriangle } from 'lucide-react';

const FamilyBudgets: React.FC = () => {
  const { familyBudgets, isLoading } = useFamily();

  if (isLoading.budgets) {
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-red-500';
    if (progress >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (progress: number) => {
    if (progress >= 100) return 'text-red-600';
    if (progress >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = (progress: number) => {
    if (progress >= 100) return 'Excedido';
    if (progress >= 80) return 'Atenção';
    return 'OK';
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Orçamentos Familiares
          </CardTitle>
          <CardDescription>
            Acompanhe os gastos por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyBudgets.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyBudgets.map((budget) => {
                // Calcular progresso (assumindo que temos dados de gastos)
                const progress = 0; // Placeholder - seria calculado com dados reais
                const isExceeded = progress >= 100;
                
                return (
                  <Card key={budget.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Categoria {budget.categoria_id}</h3>
                        {isExceeded && (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className={`font-medium ${getProgressTextColor(progress)}`}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gasto:</span>
                            <span className="font-medium">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Limite:</span>
                            <span className="font-medium">{formatCurrency(budget.valor)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Restante:</span>
                            <span className="font-medium">{formatCurrency(budget.valor)}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`font-medium ${getProgressTextColor(progress)}`}>
                              {getStatusText(progress)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mês:</span>
                            <span className="font-medium">{budget.mes}</span>
                          </div>
                        </div>
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

export default FamilyBudgets; 