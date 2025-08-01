import React from 'react';
import { usePersonal } from './PersonalProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { TrendingUp, Plus, Edit, Trash2, TrendingDown } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-states';

const PersonalTransactions: React.FC = () => {
  const { myTransactions, isLoading, deletePersonalTransaction } = usePersonal();

  if (isLoading.transactions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem a certeza que pretende eliminar esta transação?')) {
      await deletePersonalTransaction(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Transações Pessoais
              </CardTitle>
              <CardDescription>
                Histórico das suas transações pessoais
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myTransactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação pessoal encontrada</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Registar primeira transação
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myTransactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.tipo === 'receita' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.tipo === 'receita' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.descricao || 'Transação'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{transaction.categoria?.nome || 'Sem categoria'}</span>
                            <span>•</span>
                            <span>{transaction.account?.nome || 'Conta'}</span>
                            <span>•</span>
                            <span>{new Date(transaction.data).toLocaleDateString('pt-PT')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.tipo === 'receita' ? '+' : '-'}
                            {(transaction.valor || 0).toFixed(2)}€
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Pessoal
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default PersonalTransactions; 