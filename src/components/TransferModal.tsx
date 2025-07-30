import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateTransaction } from '../hooks/useTransactionsQuery';
import { useAccountsWithBalances } from '../hooks/useAccountsQuery';
import { useCategories } from '../hooks/useCategoriesQuery';
import { ensureTransferCategory } from '../services/categories';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { useToast } from '../hooks/use-toast';
import { formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
  const { user } = useAuth();
  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { data: accounts = [] } = useAccountsWithBalances();
  const { data: categories = [] } = useCategories();
  const { toast } = useToast();
  
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  // Usar as propriedades corretas das contas com saldos
  const fromAccount = accounts.find(acc => acc.account_id === fromAccountId);
  const toAccount = accounts.find(acc => acc.account_id === toAccountId);

  // Buscar categoria de transferência ou usar a primeira categoria disponível
  const transferCategory = categories.find(cat => 
    cat.nome.toLowerCase().includes('transferência') || 
    cat.nome.toLowerCase().includes('transfer')
  ) || categories[0];

  useEffect(() => {
    if (isOpen) {
      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setDescription('');
      setValidationError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!fromAccountId || !toAccountId) {
      setValidationError('Selecione as contas de origem e destino');
      return;
    }

    if (fromAccountId === toAccountId) {
      setValidationError('As contas de origem e destino devem ser diferentes');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) {
      setValidationError('Insira um valor válido');
      return;
    }

    // Verificar saldo disponível usando a propriedade correta
    if (fromAccount && numericAmount > fromAccount.saldo_disponivel) {
      setValidationError('Saldo insuficiente na conta de origem');
      return;
    }

    try {
      // Garantir que existe uma categoria de transferências
      const { data: transferCat, error: catError } = await ensureTransferCategory(user?.id || '');
      if (catError) {
        console.error('Erro ao obter categoria de transferência:', catError);
        setValidationError('Erro ao configurar categoria de transferência');
        return;
      }

      // Usar função RPC corrigida para criar APENAS UMA transação de transferência
      const { data: result, error } = await supabase.rpc('create_transfer_transaction', {
        p_from_account_id: fromAccountId,
        p_to_account_id: toAccountId,
        p_amount: numericAmount,
        p_user_id: user?.id || '',
        p_categoria_id: transferCat?.id || categories[0]?.id,
        p_description: description || `Transferência de ${fromAccount?.nome} para ${toAccount?.nome}`,
        p_data: new Date().toISOString().split('T')[0]
      });

      if (error) {
        console.error('Erro ao realizar transferência:', error);
        setValidationError(error.message || 'Erro ao realizar transferência');
        toast({
          title: 'Erro na transferência',
          description: error.message || 'Erro ao realizar transferência',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se o resultado contém erro
      if (result && typeof result === 'object' && 'error' in result) {
        const errorMessage = (result as any).error;
        console.error('Erro na transferência:', errorMessage);
        setValidationError(errorMessage);
        toast({
          title: 'Erro na transferência',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Transferência realizada',
        description: `Transferência de ${formatCurrency(numericAmount)} de ${fromAccount?.nome} para ${toAccount?.nome} realizada com sucesso.`,
      });

      onClose();
    } catch (error: any) {
      console.error('Erro ao realizar transferência:', error);
      setValidationError(error.message || 'Erro ao realizar transferência');
      
      toast({
        title: 'Erro na transferência',
        description: error.message || 'Erro ao realizar transferência',
        variant: 'destructive',
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir apenas números e vírgula/ponto
    const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setAmount(numericValue);
  };

  // Filtrar contas com saldo disponível
  const availableAccounts = accounts.filter(account => account.saldo_disponivel > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir entre Contas</DialogTitle>
          <DialogDescription>
            Transfere dinheiro de uma conta para outra. A transferência não afeta as estatísticas de receitas e despesas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fromAccount" className="text-sm font-medium">
                Conta de Origem
              </label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map(account => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.nome} - €{(account.saldo_disponivel || 0).toFixed(2)} disponível
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="toAccount" className="text-sm font-medium">
                Conta de Destino
              </label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.nome} - €{(account.saldo_atual || 0).toFixed(2)} saldo atual
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Valor a Transferir (€)
              </label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descrição (Opcional)
              </label>
              <Input
                id="description"
                type="text"
                placeholder="Descrição da transferência"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full"
              />
            </div>

            {validationError && (
              <div className="text-red-600 text-sm">{validationError}</div>
            )}

            <div className="flex gap-2">
              <FormSubmitButton 
                isSubmitting={isCreating}
                submitText="Transferir"
                submittingText="A transferir..."
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;

export { TransferModal }; 