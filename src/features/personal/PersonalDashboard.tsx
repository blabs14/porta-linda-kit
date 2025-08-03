import React from 'react';
import { usePersonal } from './PersonalProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { 
  Wallet, 
  CreditCard, 
  Target, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

const PersonalDashboard: React.FC = () => {
  const { 
    myAccounts, 
    myCards, 
    myGoals, 
    myBudgets, 
    myTransactions, 
    personalKPIs, 
    isLoading 
  } = usePersonal();

  if (isLoading.accounts || isLoading.goals || isLoading.budgets || isLoading.transactions) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Calcular estatísticas
  const totalAccounts = myAccounts.length;
  const totalCards = myCards.length;
  const activeGoals = myGoals.filter(goal => goal.ativa).length;
  const completedGoals = myGoals.filter(goal => goal.status === 'completed').length;
  
  // Transações do mês atual
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = myTransactions.filter(t => t.data.startsWith(currentMonth));
  const monthlyIncome = monthlyTransactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (t.valor || 0), 0);
  const monthlyExpenses = monthlyTransactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  // Cartões em dívida
  const cardsInDebt = myCards.filter(card => (card.saldo || 0) < 0);
  const totalDebt = cardsInDebt.reduce((sum, card) => sum + Math.abs(card.saldo || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personalKPIs.totalBalance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {totalAccounts} conta{totalAccounts !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dívida Cartões</CardTitle>
            <CreditCard className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalDebt.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {cardsInDebt.length} cartão{cardsInDebt.length !== 1 ? 's' : ''} em dívida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poupança Mensal</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(monthlyIncome - monthlyExpenses).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyIncome.toFixed(2)}€ receitas - {monthlyExpenses.toFixed(2)}€ despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeGoals}
            </div>
            <p className="text-xs text-muted-foreground">
              {completedGoals} concluído{completedGoals !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Contas e Cartões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Contas Pessoais
            </CardTitle>
            <CardDescription>
              Saldos das suas contas bancárias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma conta pessoal encontrada
              </p>
            ) : (
              myAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{account.nome}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {account.tipo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${(account.saldo || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {(account.saldo || 0).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Cartões de Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cartões de Crédito
            </CardTitle>
            <CardDescription>
              Estado dos seus cartões de crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cartão de crédito encontrado
              </p>
            ) : (
              myCards.map((card) => {
                const balance = card.saldo || 0;
                const isInDebt = balance < 0;
                
                return (
                  <div key={card.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{card.nome}</p>
                      <div className="flex items-center gap-2">
                        {isInDebt ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Em Dívida
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Em Dia
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isInDebt ? 'text-destructive' : 'text-green-600'}`}>
                        {balance.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Objetivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos Pessoais
          </CardTitle>
          <CardDescription>
            Progresso dos seus objetivos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {myGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum objetivo pessoal encontrado
            </p>
          ) : (
            myGoals.slice(0, 3).map((goal) => {
              const progress = goal.valor_objetivo > 0 
                ? ((goal.valor_atual || 0) / goal.valor_objetivo) * 100 
                : 0;
              
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{goal.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {(goal.valor_atual || 0).toFixed(2)}€ / {goal.valor_objetivo.toFixed(2)}€
                      </p>
                    </div>
                    <Badge variant={progress >= 100 ? "default" : "secondary"}>
                      {progress.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transações Recentes
          </CardTitle>
          <CardDescription>
            Últimas transações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma transação pessoal encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {myTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
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
                      <p className="text-sm text-muted-foreground">
                        {transaction.categoria?.nome || 'Sem categoria'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'receita' ? '+' : '-'}
                      {(transaction.valor || 0).toFixed(2)}€
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.data).toLocaleDateString('pt-PT')}
                    </p>
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

export default PersonalDashboard; 