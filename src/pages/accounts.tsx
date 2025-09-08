import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Wallet, Plus, Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import { useAccountsWithBalances, useDeleteAccount } from '../hooks/useAccountsQuery';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import AccountForm from '../components/AccountForm';
import CreditCardForm from '../components/CreditCardForm';
import RegularAccountForm from '../components/RegularAccountForm';
import { CreditCardBalance } from '../components/CreditCardBalance';
import { CreditCardInfo } from '../components/CreditCardInfo';
import { RegularAccountBalance } from '../components/RegularAccountBalance';
import { TransferModal } from '../components/TransferModal';
import { AccountWithBalances } from '../integrations/supabase/types';
import { ConfirmationDialog } from '../components/ui/confirmation-dialog';
import { Alert, AlertDescription } from '../components/ui/alert';





export default function AccountsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [editingAccount, setEditingAccount] = useState<{
    id: string;
    nome: string;
    tipo: string;
    saldoAtual: number;
  } | null>(null);
  
  const { user } = useAuth();
  const { data: accounts = [], isLoading, error, refetch } = useAccountsWithBalances();
  const deleteAccountMutation = useDeleteAccount();
  const { toast } = useToast();



  const handleNew = () => {
    setEditingAccount(null);
    setShowCreateModal(true);
  };

  const handleTransfer = () => {
    setShowTransferModal(true);
  };

  const handleTransferSuccess = () => {
    setShowTransferModal(false);
    refetch();
  };



  const handleEdit = (account: AccountWithBalances) => {
    // Debug: handleEdit called
    
    // Para cartões de crédito, usar o saldo da conta diretamente
    // Para outras contas, usar o saldo calculado
    let saldoAtual = 0;
    if (account.tipo === 'cartão de crédito') {
      // Buscar o saldo diretamente da tabela accounts
      // Por enquanto, usar 0 como fallback
      saldoAtual = 0; // Será atualizado via useEffect
    } else {
      saldoAtual = account.saldo_atual || 0;
    }
    
    const editData = {
      id: account.account_id,
      nome: account.nome,
      tipo: account.tipo,
      saldoAtual,
    };
    
    // Debug: editData created
    setEditingAccount(editData);
    setShowCreateModal(true);
  };

  const handleSuccess = () => {
    // Debug: handleSuccess called
    setShowCreateModal(false);
    setEditingAccount(null);
    // Debug: Forcing refetch
    refetch();
  };

  const handleDeleteAccount = (account: AccountWithBalances) => {
    setAccountToDelete({
      id: account.account_id,
      nome: account.nome
    });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      await deleteAccountMutation.mutateAsync(accountToDelete.id);
      toast({
        title: 'Conta eliminada',
        description: `A conta "${accountToDelete.nome}" foi eliminada com sucesso.`,
      });
      setShowDeleteConfirmation(false);
      setAccountToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao eliminar a conta.';
      toast({
        title: 'Erro ao eliminar conta',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar contas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar contas</p>
          <Button onClick={() => refetch()} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e acompanhe seus saldos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTransfer} variant="outline" aria-label="Transferir">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir
          </Button>
          <Button onClick={handleNew} aria-label="Nova conta">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando sua primeira conta para começar a gerir suas finanças.
          </p>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.account_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{account.nome}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {account.tipo}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {account.tipo === 'cartão de crédito' ? (
                  // Layout específico para cartões de crédito
                  <>
                    <CreditCardBalance accountId={account.account_id} fallbackBalance={account.saldo_atual || 0} accountType={account.tipo} />
                    <div className="pt-2 border-t border-gray-100">
                      <CreditCardInfo accountId={account.account_id} />
                    </div>
                  </>
                ) : (
                  // Layout normal para outras contas
                  <RegularAccountBalance account={account} />
                )}



                {/* Botões de ação - Editar e Eliminar */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(account)}
                    className="flex-1"
                    aria-label="Editar conta"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Eliminar conta"
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Editar dados da conta' : 'Criar nova conta'}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            // Debug: Modal rendering
            
            // TODO: Implementar mais tarde
            // if (editingAccount?.tipo === 'cartão de crédito') {
            //   logger.debug('[AccountsPage] Rendering CreditCardForm');
            //   return (
            //     <CreditCardForm
            //       initialData={editingAccount}
            //       onSuccess={handleSuccess}
            //       onCancel={() => setShowCreateModal(false)}
            //     />
            //   );
            // } else 
            if (editingAccount) {
              // Debug: Rendering RegularAccountForm
              return (
                <RegularAccountForm
                  initialData={editingAccount}
                  onSuccess={handleSuccess}
                  onCancel={() => setShowCreateModal(false)}
                />
              );
            } else {
              // Debug: Rendering AccountForm
              return (
                <AccountForm
                  initialData={editingAccount}
                  onSuccess={handleSuccess}
                  onCancel={() => setShowCreateModal(false)}
                />
              );
            }
          })()}
        </DialogContent>
      </Dialog>

      <TransferModal
        isOpen={showTransferModal}
        onClose={handleTransferSuccess}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setAccountToDelete(null);
        }}
        onConfirm={confirmDeleteAccount}
        title="Eliminar Conta"
        message={
          accountToDelete 
            ? `Tem a certeza que deseja eliminar "${accountToDelete.nome}"? Esta ação não pode ser desfeita e eliminará todas as transações associadas.`
            : 'Tem a certeza que deseja eliminar esta conta?'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}