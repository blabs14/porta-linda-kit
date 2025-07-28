import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAccounts } from '../hooks/useAccountsQuery';
import { useGoals } from '../hooks/useGoalsQuery';
import { useToast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface GoalAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalName: string;
}

export const GoalAllocationModal: React.FC<GoalAllocationModalProps> = ({
  isOpen,
  onClose,
  goalId,
  goalName
}) => {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data || [];
  const { allocateToGoal, isAllocating } = useGoals();
  const { toast } = useToast();

  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.accountId) {
      newErrors.accountId = 'Conta obrigatória';
    }

    if (!form.amount) {
      newErrors.amount = 'Valor obrigatório';
    } else {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Valor deve ser maior que zero';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 GoalAllocationModal: handleSubmit chamado');

    if (!validateForm()) {
      console.log('❌ Validação falhou');
      return;
    }

    console.log('✅ Validação passou, dados do formulário:', form);

    try {
      console.log('🔍 Chamando allocateToGoal...');
      await allocateToGoal({
        goalId,
        accountId: form.accountId,
        amount: parseFloat(form.amount),
        description: form.description || undefined
      });

      toast({
        title: 'Alocação criada',
        description: `Valor de ${parseFloat(form.amount).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} alocado ao objetivo "${goalName}"`,
      });

      // Reset form
      setForm({
        accountId: '',
        amount: '',
        description: ''
      });

      onClose();
    } catch (error: any) {
      console.error('Erro ao alocar valor:', error);
      
      // Verificar se é erro de objetivo completo
      if (error.message && error.message.includes('já foi atingido')) {
        toast({
          title: 'Objetivo já atingido!',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro ao alocar valor',
          description: error.message || 'Ocorreu um erro ao alocar o valor. Tente novamente.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleClose = () => {
    setForm({
      accountId: '',
      amount: '',
      description: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alocar Valor ao Objetivo</DialogTitle>
          <DialogDescription>
            Alocar valor de uma conta ao objetivo "{goalName}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Conta de Origem</Label>
            <Select
              value={form.accountId}
              onValueChange={(value) => handleChange('accountId', value)}
            >
              <SelectTrigger className={errors.accountId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nome} - {account.saldo?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountId && (
              <p className="text-sm text-red-500">{errors.accountId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor a Alocar</Label>
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
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descrição da alocação..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isAllocating}>
              {isAllocating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A alocar...
                </>
              ) : (
                'Alocar Valor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 