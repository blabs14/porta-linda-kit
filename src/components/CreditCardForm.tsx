import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateAccount, useCreateAccount } from '../hooks/useAccountsQuery';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { Alert, AlertDescription } from './ui/alert';
import { CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CreditCardFormData {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual?: number;
  ajusteSaldo?: number | string;
}

interface CreditCardFormProps {
  initialData: CreditCardFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreditCardForm = ({ initialData, onSuccess, onCancel }: CreditCardFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreditCardFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const initialCurrentBalance = Number(initialData.saldoAtual || 0);
  const targetChanged = typeof form.saldoAtual === 'number' && Number(form.saldoAtual) !== initialCurrentBalance;
  const hasManualAdjustment = !!Number(form.ajusteSaldo);
  
  const updateAccountMutation = useUpdateAccount();
  const createAccountMutation = useCreateAccount();
  
  const isEditing = Boolean(initialData.id);
  const isSubmitting = isEditing ? updateAccountMutation.isPending : createAccountMutation.isPending;

  console.log('[CreditCardForm] initialData:', initialData);
  console.log('[CreditCardForm] form state:', form);
  console.log('[CreditCardForm] isSubmitting:', isSubmitting);

  const fetchAccountBalance = useCallback(async () => {
    try {
      if (!initialData.id) return; // evitar uuid inválido
      const { data, error } = await supabase
        .from('accounts')
        .select('saldo')
        .eq('id', initialData.id)
        .single();
      if (error) {
        console.error('[CreditCardForm] Error fetching account balance:', error);
        return;
      }
      setForm(prev => ({ ...prev, saldoAtual: (data as any)?.saldo || 0 }));
    } catch (error) {
      console.error('[CreditCardForm] Error fetching account balance:', error);
    }
  }, [initialData.id]);

  useEffect(() => {
    console.log('[CreditCardForm] useEffect triggered with initialData:', initialData);
    if (initialData) {
      console.log('[CreditCardForm] Setting form data:', initialData);
      setForm(initialData);
      
      // Para cartões de crédito, buscar o saldo correto da conta
      if (initialData.tipo === 'cartão de crédito' && isEditing && initialData.id) {
        void fetchAccountBalance();
      }
    }
  }, [initialData, fetchAccountBalance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'saldoAtual' || name === 'ajusteSaldo') {
      // Permitir valores vazios
      if (value === '' || value === '-') {
        setForm({ ...form, [name]: value === '' ? 0 : value });
        return;
      }
      
      // Permitir números negativos, positivos e vírgula/ponto
      const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      
      // Verificar se é um número válido
      const parsedValue = parseFloat(numericValue);
      if (!isNaN(parsedValue)) {
        if (name === 'saldoAtual') {
          setForm({ ...form, saldoAtual: parsedValue, ajusteSaldo: 0 });
        } else {
          setForm({ ...form, ajusteSaldo: parsedValue });
        }
      } else if (value === '-') {
        // Manter o sinal negativo se o utilizador acabou de digitar
        setForm({ ...form, [name]: value });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação manual para campos obrigatórios
    const errors: Record<string, string> = {};
    
    if (!form.nome.trim()) {
      errors.nome = 'Nome obrigatório';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      // Simplificar o parsing dos valores
      let saldoAtual = 0;
      let ajusteSaldo = 0;
      
      if (form.saldoAtual !== undefined && form.saldoAtual !== null) {
        if (typeof form.saldoAtual === 'string') {
          saldoAtual = parseFloat(form.saldoAtual) || 0;
        } else {
          saldoAtual = Number(form.saldoAtual) || 0;
        }
      }
      
      if (form.ajusteSaldo !== undefined && form.ajusteSaldo !== null) {
        if (typeof form.ajusteSaldo === 'string') {
          ajusteSaldo = parseFloat(form.ajusteSaldo) || 0;
        } else {
          ajusteSaldo = Number(form.ajusteSaldo) || 0;
        }
      }
      
      const payload = {
        nome: form.nome.trim(),
        tipo: 'cartão de crédito',
      };
      
      console.log('[CreditCardForm] Form values:', form);
      console.log('[CreditCardForm] Parsed values - saldoAtual:', saldoAtual, 'ajusteSaldo:', ajusteSaldo);
      console.log('[CreditCardForm] Submitting payload:', payload);
      console.log('[CreditCardForm] Is editing:', isEditing);
      console.log('[CreditCardForm] Account ID:', form.id);
      
      let result;
      if (isEditing) {
        // Em edição: atualizar nome/tipo; aplicar saldo/ajuste via update incremental
        await updateAccountMutation.mutateAsync({ id: form.id, nome: payload.nome, tipo: payload.tipo });
        if (saldoAtual !== 0) {
          await updateAccountMutation.mutateAsync({ id: form.id, saldoAtual });
        }
        if (ajusteSaldo !== 0) {
          await updateAccountMutation.mutateAsync({ id: form.id, ajusteSaldo });
        }
        result = { id: form.id };
      } else {
        const created = await createAccountMutation.mutateAsync(payload as any);
        // Após criar, aplicar saldo/ajuste se fornecidos
        if (created?.id) {
          if (saldoAtual !== 0) {
            await updateAccountMutation.mutateAsync({ id: created.id, saldoAtual });
          }
          if (ajusteSaldo !== 0) {
            await updateAccountMutation.mutateAsync({ id: created.id, ajusteSaldo });
          }
        }
        result = created;
      }
      console.log('[CreditCardForm] Update result:', result);
      
      // Aguardar um pouco para garantir que as queries foram atualizadas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['personal', 'accounts', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['personal', 'kpis', user?.id] })
      ]);

      toast({ title: isEditing ? 'Cartão atualizado' : 'Cartão criado', description: isEditing ? 'Dados do cartão atualizados com sucesso.' : 'Novo cartão criado com sucesso.' });
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao guardar cartão de crédito:', err);
      toast({ title: 'Erro ao guardar cartão', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <Input
        name="nome"
        placeholder="Nome do Cartão"
        value={form.nome}
        onChange={handleChange}
        required
        className="w-full"
        aria-invalid={!!validationErrors.nome}
        aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
      />
      {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm">{validationErrors.nome}</div>}
      
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          Cartões de crédito começam com saldo 0€. O saldo negativo representa o valor em dívida.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-1">
        <Input
          name="saldoAtual"
          type="text"
          placeholder="Saldo Atual (€) - Opcional"
          value={form.saldoAtual?.toString() || ''}
          onChange={handleChange}
          className="w-full"
          disabled={hasManualAdjustment}
          aria-invalid={!!validationErrors.saldoAtual}
          aria-describedby={validationErrors.saldoAtual ? 'saldoAtual-error' : undefined}
        />
        {validationErrors.saldoAtual && <div id="saldoAtual-error" className="text-red-600 text-sm">{validationErrors.saldoAtual}</div>}
        {!validationErrors.saldoAtual && (
          <p className="text-xs text-muted-foreground">
            Para cartões, valores negativos representam dívida. Será criada uma regularização própria de cartão pela diferença para atingir este saldo.
            {targetChanged && (
              <> Diferença: {((Number(form.saldoAtual) || 0) - initialCurrentBalance).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</>
            )}
            {hasManualAdjustment && (
              <span className="block">Desativado porque definiu um ajuste manual.</span>
            )}
          </p>
        )}
      </div>
       
      <div className="space-y-1">
        <Input
          name="ajusteSaldo"
          type="text"
          placeholder="Ajuste de Saldo (+/- €) - Opcional"
          value={form.ajusteSaldo?.toString() || ''}
          onChange={handleChange}
          className="w-full"
          disabled={targetChanged}
          aria-invalid={!!validationErrors.ajusteSaldo}
          aria-describedby={validationErrors.ajusteSaldo ? 'ajusteSaldo-error' : undefined}
        />
        {validationErrors.ajusteSaldo && <div id="ajusteSaldo-error" className="text-red-600 text-sm">{validationErrors.ajusteSaldo}</div>}
        {!validationErrors.ajusteSaldo && (
          <p className="text-xs text-muted-foreground">
            O ajuste cria uma transação de regularização: valores positivos registam receita; valores negativos registam despesa. {targetChanged && 'Desativado porque definiu um novo saldo alvo.'}
          </p>
        )}
      </div>
        
      <div className="flex flex-col sm:flex-row gap-2">
        <FormSubmitButton 
          isSubmitting={isSubmitting}
          submitText={isEditing ? "Atualizar" : "Criar Cartão"}
          submittingText={isEditing ? "A atualizar..." : "A criar..."}
          className="w-full"
        />
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>
    </form>
  );
};

export default CreditCardForm;