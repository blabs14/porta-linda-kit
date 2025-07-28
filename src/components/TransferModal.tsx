import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateTransaction } from '../hooks/useTransactionsQuery';
import { useAccountsWithBalances } from '../hooks/useAccountsQuery';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { ModalTransition } from './ui/transition-wrapper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
  const { user } = useAuth();
  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { data: accounts = [] } = useAccountsWithBalances();
  
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  const fromAccount = accounts.find(acc => acc.account_id === fromAccountId);
  const toAccount = accounts.find(acc => acc.account_id === toAccountId);

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

    if (fromAccount && numericAmount > fromAccount.saldo_disponivel) {
      setValidationError('Saldo insuficiente na conta de origem');
      return;
    }

    try {
      // Criar transação de débito na conta de origem
      await createTransaction({
        account_id: fromAccountId,
        categoria_id: '', // Será preenchida automaticamente ou deixada vazia
        tipo: 'transferencia',
        valor: numericAmount,
        descricao: description || `Transferência para ${toAccount?.nome}`,
        data: new Date().toISOString().split('T')[0],
        user_id: user?.id || '',
      });

      // Criar transação de crédito na conta de destino
      await createTransaction({
        account_id: toAccountId,
        categoria_id: '', // Será preenchida automaticamente ou deixada vazia
        tipo: 'transferencia',
        valor: numericAmount,
        descricao: description || `Transferência de ${fromAccount?.nome}`,
        data: new Date().toISOString().split('T')[0],
        user_id: user?.id || '',
      });

      onClose();
    } catch (error) {
      console.error('Erro ao processar transferência:', error);
      setValidationError('Erro ao processar transferência');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir apenas números e vírgula/ponto
    const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setAmount(numericValue);
  };

  const availableAccounts = accounts.filter(account => account.saldo_disponivel > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir entre Contas</DialogTitle>
        </DialogHeader>
        
        <ModalTransition isVisible={isOpen}>
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
                      {account.nome} - €{account.saldo_disponivel.toFixed(2)} disponível
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
                      {account.nome} - €{account.saldo_atual.toFixed(2)} saldo atual
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
        </ModalTransition>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;

export { TransferModal }; 