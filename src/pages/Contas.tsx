import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Wallet, Plus, Edit, Trash2, ArrowRightLeft, Target } from 'lucide-react';
import { useAccountsWithBalances, useDeleteAccount } from '../hooks/useAccountsQuery';
import { useToast } from '../hooks/use-toast';
import { formatCurrency } from '../lib/utils';
import FormularioConta from '../components/FormularioConta';
import { TransferModal } from '../components/TransferModal';
import { AccountWithBalances } from '../integrations/supabase/types';
import { useConfirmation } from '../components/ui/confirmation-dialog';

export default function ContasPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{
    id: string;
    nome: string;
    tipo: string;
    saldo: number;
  } | null>(null);
  
  const { data: accounts = [], isLoading, error, refetch } = useAccountsWithBalances();
  const deleteAccountMutation = useDeleteAccount();
  const { toast } = useToast();
  const { confirm } = useConfirmation();

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
    const editData = {
      id: account.account_id,
      nome: account.nome,
      tipo: account.tipo,
      saldo: account.saldo_atual || 0,
    };
    setEditingAccount(editData);
    setShowCreateModal(true);
  };

  const handleSuccess = () => {
    setShowCreateModal(false);
    setEditingAccount(null);
    refetch();
  };

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find(acc => acc.account_id === id);
    const accountName = account?.nome || 'esta conta';
    
    confirm(
      'Eliminar Conta',
      `Tem a certeza que deseja eliminar "${accountName}"? Esta ação não pode ser desfeita e eliminará todas as transações associadas.`,
      async () => {
        try {
          await deleteAccountMutation.mutateAsync(id);
          toast({
            title: 'Conta eliminada',
            description: `A conta "${accountName}" foi eliminada com sucesso.`,
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao eliminar conta',
            description: error.message || 'Ocorreu um erro ao eliminar a conta.',
            variant: 'destructive',
          });
        }
      },
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      }
    );
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
          <Button onClick={handleTransfer} variant="outline">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir
          </Button>
          <Button onClick={handleNew}>
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
                {/* Saldo Total */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Saldo Total</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(account.saldo_atual || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{account.tipo}</p>
                </div>

                {/* Saldo Reservado */}
                {account.total_reservado > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Reservado
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {formatCurrency(account.total_reservado)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Saldo Disponível */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Disponível</span>
                    <span className={`text-sm font-medium ${
                      account.saldo_disponivel < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(account.saldo_disponivel)}
                    </span>
                  </div>
                  {account.total_reservado > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (account.total_reservado / (account.saldo_atual || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTransferModal(true);
                    }}
                    className="flex-1"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Transferir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.account_id)}
                    className="text-red-600 hover:text-red-700"
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
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
          <FormularioConta
            initialData={editingAccount}
            onSuccess={handleSuccess}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      <TransferModal
        isOpen={showTransferModal}
        onClose={handleTransferSuccess}
      />
    </div>
  );
} 