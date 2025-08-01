import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { usePersonal } from './PersonalProvider';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Wallet, 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  AlertCircle,
  CheckCircle,
  PiggyBank,
  TrendingUp
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-states';

// Componente de lista de contas
const AccountsList: React.FC = () => {
  const { myAccounts, myCards, isLoading, deletePersonalAccount } = usePersonal();
  const navigate = useNavigate();

  if (isLoading.accounts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem a certeza que pretende eliminar esta conta?')) {
      await deletePersonalAccount(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Contas Bancárias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Contas Bancárias
              </CardTitle>
              <CardDescription>
                Suas contas correntes, poupança e investimento
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/personal/accounts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma conta bancária encontrada</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/personal/accounts/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira conta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAccounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {account.tipo === 'poupança' && <PiggyBank className="h-4 w-4 text-green-600" />}
                        {account.tipo === 'investimento' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                        {account.tipo === 'corrente' && <Wallet className="h-4 w-4 text-primary" />}
                        {account.tipo === 'outro' && <Wallet className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold">{account.nome}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/personal/accounts/edit/${account.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">
                          {account.tipo}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Pessoal
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${(account.saldo || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {(account.saldo || 0).toFixed(2)}€
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo atual
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cartões de Crédito */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Cartões de Crédito
              </CardTitle>
              <CardDescription>
                Estado dos seus cartões de crédito
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/personal/accounts/new-card')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cartão de crédito encontrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/personal/accounts/new-card')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar cartão
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCards.map((card) => {
                const balance = card.saldo || 0;
                const isInDebt = balance < 0;
                
                return (
                  <Card key={card.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-orange-600" />
                          <h3 className="font-semibold">{card.nome}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/personal/accounts/edit/${card.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Cartão de Crédito
                          </span>
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
                            <Badge variant="outline" className="text-xs">
                              Pessoal
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${isInDebt ? 'text-destructive' : 'text-green-600'}`}>
                            {balance.toFixed(2)}€
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isInDebt ? 'Dívida atual' : 'Limite disponível'}
                          </p>
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

// Componente de formulário de nova conta (placeholder)
const NewAccountForm: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={() => navigate('/personal/accounts')}>
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">Nova Conta Pessoal</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Conta</CardTitle>
            <CardDescription>
              Crie uma nova conta bancária pessoal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Formulário de criação de conta será implementado aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente de edição de conta (placeholder)
const EditAccountForm: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={() => navigate('/personal/accounts')}>
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">Editar Conta</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Editar Conta</CardTitle>
            <CardDescription>
              Modifique os dados da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Formulário de edição de conta será implementado aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente principal
const PersonalAccounts: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AccountsList />} />
      <Route path="new" element={<NewAccountForm />} />
      <Route path="new-card" element={<NewAccountForm />} />
      <Route path="edit/:id" element={<EditAccountForm />} />
    </Routes>
  );
};

export default PersonalAccounts; 