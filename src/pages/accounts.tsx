import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet, Plus, Edit, Trash2 } from 'lucide-react';
import { useAccounts, useDeleteAccount } from '../hooks/useAccountsQuery';
import AccountForm from '../components/AccountForm';
import { showError, showSuccess } from '../lib/utils';
import { LoadingSpinner } from '../components/ui/loading-states';

const AccountsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any | null>(null);
  
  // Usar TanStack Query hooks
  const { data: accounts = [], isLoading, error } = useAccounts();
  const deleteAccountMutation = useDeleteAccount();

  const handleNew = () => {
    setEditAccount(null);
    setModalOpen(true);
  };

  const handleEdit = (account: any) => {
    setEditAccount(account);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditAccount(null);
    showSuccess('Conta guardada com sucesso!');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover esta conta?')) return;
    
    try {
      await deleteAccountMutation.mutateAsync(id);
      showSuccess('Conta removida com sucesso!');
    } catch (error: any) {
      showError(error.message || 'Erro ao remover conta');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 bg-background border-b p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Contas</h1>
            <Button onClick={handleNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            Erro ao carregar contas: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Cabeçalho Fixo - Sempre visível */}
      <div className="flex-shrink-0 bg-background border-b p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Contas</h1>
          <Button onClick={handleNew} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>
      
      {/* Conteúdo com Scroll apenas nos dados */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <p className="text-sm">Clica em "Nova Conta" para começar</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                  <Card key={account.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{account.nome}</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {account.saldo ? formatCurrency(account.saldo) : '€0,00'}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{account.tipo}</p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(account.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteAccountMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deleteAccountMutation.isPending ? 'A remover...' : 'Remover'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {editAccount ? 'Editar dados da conta' : 'Criar nova conta'}
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            initialData={editAccount}
            onSuccess={handleSuccess}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPage; 