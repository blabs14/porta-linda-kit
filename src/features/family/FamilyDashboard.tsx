import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { 
  Wallet, 
  CreditCard, 
  Target, 
  TrendingUp, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Suspense } from 'react';
import { LazyReportChart, LazyChart, LazyFallback } from './lazy';

const FamilyDashboard: React.FC = () => {
  const { 
    family, 
    familyKPIs, 
    members, 
    pendingInvites, 
    familyAccounts, 
    familyGoals, 
    familyBudgets,
    isLoading 
  } = useFamily();

  // Dados simulados para gráficos (serão substituídos por dados reais)
  const expensesData = [
    { month: 'Jan', value: 1200 },
    { month: 'Fev', value: 1400 },
    { month: 'Mar', value: 1100 },
    { month: 'Abr', value: 1600 },
    { month: 'Mai', value: 1300 },
    { month: 'Jun', value: 1500 }
  ];

  const categoryData = [
    { category: 'Alimentação', value: 800 },
    { category: 'Transporte', value: 400 },
    { category: 'Lazer', value: 300 },
    { category: 'Saúde', value: 200 },
    { category: 'Outros', value: 100 }
  ];

  if (isLoading.family || isLoading.kpis) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar dados da família...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Nenhuma Família Encontrada
            </CardTitle>
            <CardDescription>
              Não foi encontrada nenhuma família associada à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para começar a usar as Finanças Partilhadas, crie uma nova família ou aceite um convite existente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header da Família */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            {family.nome}
          </h2>
          <p className="text-sm text-muted-foreground">
            {family.description || 'Finanças partilhadas da família'}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {members.length} membros
        </Badge>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(familyKPIs.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Contas bancárias familiares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dívida Cartões</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(familyKPIs.creditCardDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cartões de crédito familiares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poupança Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(familyKPIs.monthlySavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas do mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Objetivo</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {familyKPIs.topGoalProgress.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivo principal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Contas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Contas Familiares
          </CardTitle>
          <CardDescription>
            {familyAccounts.length} contas ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyAccounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma conta familiar encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {familyAccounts.slice(0, 3).map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      account.tipo === 'cartão de crédito' ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="font-medium">{account.nome}</p>
                      <p className="text-sm text-muted-foreground">{account.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(account.saldo_atual || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Disponível: {formatCurrency(account.saldo_disponivel || 0)}
                    </p>
                  </div>
                </div>
              ))}
              {familyAccounts.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{familyAccounts.length - 3} mais contas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Objetivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos Familiares
          </CardTitle>
          <CardDescription>
            {familyGoals.length} objetivos ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyGoals.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum objetivo familiar encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {familyGoals.slice(0, 2).map((goal) => {
                const progress = ((goal.valor_atual || 0) / (goal.valor_objetivo || 1)) * 100;
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{goal.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(goal.valor_atual || 0)} / {formatCurrency(goal.valor_objetivo)}
                      </p>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {progress.toFixed(1)}% concluído
                    </p>
                  </div>
                );
              })}
              {familyGoals.length > 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{familyGoals.length - 2} mais objetivos
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Membros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros Ativos
            </CardTitle>
            <CardDescription>
              {members.length} membros na família
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum membro encontrado
              </p>
            ) : (
              <div className="space-y-3">
                {members.slice(0, 4).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.profile?.nome?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.profile?.nome || 'Utilizador'}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {members.length > 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{members.length - 4} mais membros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Convites Pendentes
            </CardTitle>
            <CardDescription>
              {pendingInvites.filter(invite => invite.status === 'pending').length} convites aguardando
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvites.filter(invite => invite.status === 'pending').length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum convite pendente
              </p>
            ) : (
              <div className="space-y-3">
                {pendingInvites
                  .filter(invite => invite.status === 'pending')
                  .slice(0, 3)
                  .map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Convite enviado em {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {invite.role}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Visualizações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução das Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LazyFallback message="A carregar gráfico..." />}>
              <LazyChart
                data={expensesData}
                type="line"
                height={300}
              />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LazyFallback message="A carregar gráfico..." />}>
              <LazyReportChart
                data={categoryData}
                type="pie"
                height={300}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyDashboard; 