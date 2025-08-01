import React from 'react';
import { usePersonal } from './PersonalProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BarChart3, Plus, Edit, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-states';

const PersonalBudgets: React.FC = () => {
  const { myBudgets, isLoading, deletePersonalBudget } = usePersonal();

  if (isLoading.budgets) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem a certeza que pretende eliminar este orçamento?')) {
      await deletePersonalBudget(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Orçamentos Pessoais
              </CardTitle>
              <CardDescription>
                Seus orçamentos mensais por categoria
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myBudgets.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento pessoal encontrado</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro orçamento
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBudgets.map((budget) => (
                <Card key={budget.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: budget.categoria?.cor || '#3B82F6' }}
                        />
                        <h3 className="font-semibold">{budget.categoria?.nome || 'Sem categoria'}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(budget.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {budget.valor.toFixed(2)}€
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Orçamento mensal
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Mês: {budget.mes}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Pessoal
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalBudgets; 