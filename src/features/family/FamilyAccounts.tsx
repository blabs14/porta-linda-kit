import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Wallet, Plus, Edit, Trash2, ArrowRightLeft, Target, CreditCard, AlertTriangle } from 'lucide-react';
import { useFamily } from './FamilyProvider';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import AccountForm from '../../components/AccountForm';
import RegularAccountForm from '../../components/RegularAccountForm';
import { TransferModal } from '../../components/TransferModal';
import { AccountWithBalances } from '../../integrations/supabase/types';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';

const FamilyAccounts: React.FC = () => {
  const { 
    familyAccounts, 
    familyCards, 
    createFamilyAccount, 
    updateFamilyAccount, 
    deleteFamilyAccount,
    isLoading,
    canEdit,
    canDelete
  } = useFamily();
  
  const { toast } = useToast();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithBalances | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountWithBalances | null>(null);

  // Separar contas normais de cartões de crédito
  const regularAccounts = familyAccounts.filter(account => account.tipo !== 'cartão de crédito');

  const handleNew = () => {
    setEditingAccount(null);
    setShowCreateModal(true);
  };

  const handleTransfer = () => {
    setShowTransferModal(true);
  };

  const handleTransferSuccess = () => {
    setShowTransferModal(false);
    toast({
      title: 'Transferência realizada',
      description: 'A transferência foi realizada com sucesso.',
    });
  };

  const handleEdit = (account: AccountWithBalances) => {
    setEditingAccount(account);
    setShowCreateModal(true);
  };

  const handleSuccess = async (data: any) => {
    try {
      if (editingAccount) {
        await updateFamilyAccount(editingAccount.account_id, data);
        toast({
          title: 'Conta atualizada',
          description: 'A conta foi atualizada com sucesso.',
        });
      } else {
        await createFamilyAccount(data);
        toast({
          title: 'Conta criada',
          description: 'A conta foi criada com sucesso.',
        });
      }
      setShowCreateModal(false);
      setEditingAccount(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao processar a conta.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = (account: AccountWithBalances) => {
    setAccountToDelete(account);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      await deleteFamilyAccount(accountToDelete.account_id);
      toast({
        title: 'Conta eliminada',
        description: `A conta "${accountToDelete.nome}" foi eliminada com sucesso.`,
      });
      setShowDeleteConfirmation(false);
      setAccountToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar conta',
        description: error.message || 'Ocorreu um erro ao eliminar a conta.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading.accounts) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar contas familiares...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Familiares</h1>
          <p className="text-muted-foreground">
            Gerencie as contas bancárias partilhadas da família
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit('account') && (
            <>
              <Button onClick={handleTransfer} variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir
              </Button>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </>
          )}
        </div>
      </div>

      {familyAccounts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma conta familiar encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando a primeira conta familiar para começar a gerir as finanças partilhadas.
          </p>
          {canEdit('account') && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Conta
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Contas Bancárias */}
          {regularAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Contas Bancárias</h2>
                <Badge variant="outline">{regularAccounts.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {regularAccounts.map((account) => (
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
                            <Badge variant="secondary" className="text-xs text-blue-600 bg-blue-50 border-blue-200">
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
                      </div>

                      {/* Botões de ação - Editar e Eliminar */}
                      {canEdit('account') && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          {canDelete('account') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAccount(account)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cartões de Crédito */}
          {familyCards.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold">Cartões de Crédito</h2>
                <Badge variant="outline">{familyCards.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {familyCards.map((card) => (
                  <Card key={card.account_id} className="hover:shadow-md transition-shadow border-red-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{card.nome}</CardTitle>
                        <Badge variant="destructive" className="capitalize">
                          {card.tipo}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Saldo Total */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Saldo Total</span>
                          <span className={`text-lg font-semibold ${
                            (card.saldo_atual || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {formatCurrency(card.saldo_atual || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{card.tipo}</p>
                      </div>

                      {/* Status do Cartão */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={(card.saldo_atual || 0) < 0 ? "destructive" : "default"} className="text-xs">
                            {(card.saldo_atual || 0) < 0 ? 'Em Dívida' : 'Em Dia'}
                          </Badge>
                        </div>
                      </div>

                      {/* Saldo Disponível */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Disponível</span>
                          <span className={`text-sm font-medium ${
                            card.saldo_disponivel < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(card.saldo_disponivel)}
                          </span>
                        </div>
                      </div>

                      {/* Botões de ação - Editar e Eliminar */}
                      {canEdit('account') && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(card)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          {canDelete('account') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAccount(card)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta Familiar' : 'Nova Conta Familiar'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Editar dados da conta familiar' : 'Criar nova conta familiar'}
            </DialogDescription>
          </DialogHeader>
                     {(() => {
             if (editingAccount) {
               return (
                 <RegularAccountForm
                   initialData={{
                     id: editingAccount.account_id,
                     nome: editingAccount.nome,
                     tipo: editingAccount.tipo,
                     saldoAtual: editingAccount.saldo_atual || 0
                   }}
                   onSuccess={() => handleSuccess(editingAccount)}
                   onCancel={() => setShowCreateModal(false)}
                 />
               );
             } else {
               return (
                 <AccountForm
                   initialData={editingAccount}
                   onSuccess={() => handleSuccess({})}
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
        title="Eliminar Conta Familiar"
        message={
          accountToDelete 
            ? `Tem a certeza que deseja eliminar "${accountToDelete.nome}"? Esta ação não pode ser desfeita e eliminará todas as transações associadas.`
            : 'Tem a certeza que deseja eliminar esta conta familiar?'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
};

export default FamilyAccounts; 