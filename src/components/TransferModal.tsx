import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAccounts } from '../hooks/useAccountsQuery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAccountId?: string; // Conta de origem (opcional, se não fornecida mostra todas)
}

export function TransferModal({ isOpen, onClose, sourceAccountId }: TransferModalProps) {
  const { data: accounts = [] } = useAccounts();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    sourceAccountId: sourceAccountId || '',
    targetAccountId: '',
    amount: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar contas disponíveis (excluir a conta de destino da lista de origem)
  const availableSourceAccounts = accounts.filter(account => 
    !sourceAccountId || account.id === sourceAccountId
  );
  
  const availableTargetAccounts = accounts.filter(account => 
    account.id !== form.sourceAccountId
  );

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.sourceAccountId) {
      newErrors.sourceAccountId = 'Conta de origem obrigatória';
    }

    if (!form.targetAccountId) {
      newErrors.targetAccountId = 'Conta de destino obrigatória';
    }

    if (form.sourceAccountId === form.targetAccountId) {
      newErrors.targetAccountId = 'Conta de destino deve ser diferente da origem';
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    // Verificar se a conta de origem tem saldo suficiente
    const sourceAccount = accounts.find(acc => acc.id === form.sourceAccountId);
    if (sourceAccount && parseFloat(form.amount) > Number(sourceAccount.saldo)) {
      newErrors.amount = 'Saldo insuficiente na conta de origem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = parseFloat(form.amount);
      const sourceAccount = accounts.find(acc => acc.id === form.sourceAccountId);
      const targetAccount = accounts.find(acc => acc.id === form.targetAccountId);

      if (!sourceAccount || !targetAccount) {
        throw new Error('Conta não encontrada');
      }

      // Criar transação de saída (despesa) na conta de origem
      const sourceTransaction = {
        account_id: form.sourceAccountId,
        valor: amount,
        categoria_id: await getTransferCategoryId(),
        data: new Date().toISOString().split('T')[0],
        descricao: `Transferência para ${targetAccount.nome}${form.description ? ` - ${form.description}` : ''}`,
        tipo: 'despesa',
        user_id: user?.id
      };

      // Criar transação de entrada (receita) na conta de destino
      const targetTransaction = {
        account_id: form.targetAccountId,
        valor: amount,
        categoria_id: await getTransferCategoryId(),
        data: new Date().toISOString().split('T')[0],
        descricao: `Transferência de ${sourceAccount.nome}${form.description ? ` - ${form.description}` : ''}`,
        tipo: 'receita',
        user_id: user?.id
      };

      // Executar as duas transações
      const { createTransaction } = await import('../services/transactions');
      
      await createTransaction(sourceTransaction, user?.id || '');
      await createTransaction(targetTransaction, user?.id || '');

      toast({
        title: 'Transferência realizada',
        description: `Transferência de ${amount.toFixed(2)}€ realizada com sucesso!`,
      });

      // Limpar formulário
      setForm({
        sourceAccountId: sourceAccountId || '',
        targetAccountId: '',
        amount: '',
        description: ''
      });
      setErrors({});
      
      // Fechar modal e chamar onClose para atualizar a página
      onClose();

    } catch (error: any) {
      console.error('Erro ao realizar transferência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao realizar transferência. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransferCategoryId = async () => {
    // Buscar categoria "Transferências" ou criar se não existir
    const { data: transferCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('nome', 'Transferências')
      .eq('user_id', user?.id)
      .single();

    if (transferCategory) {
      return transferCategory.id;
    }

    // Criar categoria "Transferências" se não existir
    const { data: newCategory } = await supabase
      .from('categories')
      .insert({
        nome: 'Transferências',
        cor: '#6B7280',
        user_id: user?.id
      })
      .select('id')
      .single();

    return newCategory?.id;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir entre Contas</DialogTitle>
          <DialogDescription>
            Transfira dinheiro de uma conta para outra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceAccount">Conta de Origem</Label>
            <Select
              value={form.sourceAccountId}
              onValueChange={(value) => handleChange('sourceAccountId', value)}
            >
              <SelectTrigger className={errors.sourceAccountId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecionar conta de origem" />
              </SelectTrigger>
              <SelectContent>
                {availableSourceAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{account.nome}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatCurrency(Number(account.saldo))}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sourceAccountId && (
              <p className="text-sm text-red-500">{errors.sourceAccountId}</p>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAccount">Conta de Destino</Label>
            <Select
              value={form.targetAccountId}
              onValueChange={(value) => handleChange('targetAccountId', value)}
            >
              <SelectTrigger className={errors.targetAccountId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecionar conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableTargetAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{account.nome}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatCurrency(Number(account.saldo))}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetAccountId && (
              <p className="text-sm text-red-500">{errors.targetAccountId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="0,00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descrição da transferência"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                'Transferir'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 