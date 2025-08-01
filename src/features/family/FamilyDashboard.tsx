import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { 
  Wallet, 
  Target, 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard,
  PiggyBank,
  AlertCircle
} from 'lucide-react';

const FamilyDashboard: React.FC = () => {
  const { 
    family, 
    familyKPIs, 
    familyAccounts, 
    familyGoals, 
    familyBudgets, 
    familyTransactions,
    members,
    pendingInvites,
    isLoading 
  } = useFamily();

  if (isLoading.family) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma família encontrada</h3>
            <p className="text-muted-foreground">
              Você ainda não pertence a nenhuma família ou não tem permissões para acessar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Resumo da Família */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyKPIs.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Membros ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyKPIs.pendingInvites}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Partilhadas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyAccounts.length}</div>
            <p className="text-xs text-muted-foreground">
              Contas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos Ativos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {familyGoals.filter(goal => goal.ativa).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Em progresso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Ver Contas</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Objetivos</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">Orçamentos</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">Membros</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Últimas Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
          <CardDescription>
            As transações mais recentes da família
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
              {familyTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.descricao || 'Transação'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.data).toLocaleDateString('pt-PT')}
                    </p>
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

      {/* Objetivos em Destaque */}
      <Card>
        <CardHeader>
          <CardTitle>Objetivos em Destaque</CardTitle>
          <CardDescription>
            Objetivos familiares com maior progresso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyGoals.filter(goal => goal.ativa).length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum objetivo ativo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {familyGoals
                .filter(goal => goal.ativa)
                .sort((a, b) => (b.valor_atual || 0) - (a.valor_atual || 0))
                .slice(0, 3)
                .map((goal) => {
                  const progress = ((goal.valor_atual || 0) / (goal.valor_objetivo || 1)) * 100;
                  return (
                    <div key={goal.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{goal.nome}</h4>
                        <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatCurrency(goal.valor_atual || 0)}</span>
                        <span>{formatCurrency(goal.valor_objetivo)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyDashboard; 