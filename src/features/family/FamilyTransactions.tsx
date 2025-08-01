import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

const FamilyTransactions: React.FC = () => {
  const { familyTransactions, isLoading } = useFamily();

  if (isLoading.transactions) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalIncome = familyTransactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const totalExpenses = familyTransactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="p-6 space-y-6">
      {/* Resumo das Transações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de receitas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <div className={`h-4 w-4 ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netAmount >= 0 ? <TrendingUp /> : <TrendingDown />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transações Familiares
          </CardTitle>
          <CardDescription>
            Histórico de transações partilhadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyTransactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.tipo === 'receita' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.tipo === 'receita' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.descricao || 'Transação'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.data).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.tipo === 'receita' ? '+' : '-'} {formatCurrency(transaction.valor)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyTransactions; 