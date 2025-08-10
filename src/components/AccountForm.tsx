import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateAccount, useUpdateAccount } from '../hooks/useAccountsQuery';
import { accountSchema } from '../validation/accountSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { Alert, AlertDescription } from './ui/alert';
import { CreditCard } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { useConfirmation } from '../hooks/useConfirmation';
import { ConfirmationDialog } from './ui/confirmation-dialog';

interface AccountFormData {
  id?: string;
  nome: string;
  tipo: string;
  saldoAtual?: number;
  ajusteSaldo?: number | string;
}

interface AccountFormProps {
  initialData?: AccountFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupança', label: 'Conta Poupança' },
  { value: 'investimento', label: 'Conta Investimento' },
  { value: 'outro', label: 'Outro' },
];

const AccountForm = ({ initialData, onSuccess, onCancel }: AccountFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<AccountFormData>(
    initialData || { nome: '', tipo: '', saldoAtual: 0, ajusteSaldo: 0 }
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(initialData?.id);
  const initialCurrentBalance = Number(initialData?.saldoAtual ?? 0);
  const targetChanged = isEditing && typeof form.saldoAtual === 'number' && Number(form.saldoAtual) !== initialCurrentBalance;
  const hasManualAdjustment = isEditing && !!Number(form.ajusteSaldo);
  
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const confirmation = useConfirmation();
  
  const isSubmitting = createAccountMutation.isPending || updateAccountMutation.isPending;



  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'saldoAtual' || name === 'ajusteSaldo') {
      // Permitir valores vazios
      if (value === '' || value === '-') {
        setForm({ ...form, [name]: value === '' ? 0 : value });
        return;
      }
      
      // Permitir números negativos, positivos e vírgula/ponto
      // Manter o sinal negativo se presente
      const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      
      // Verificar se é um número válido
      const parsedValue = parseFloat(numericValue);
      if (!isNaN(parsedValue)) {
        // Exclusão mútua: se alterar saldo alvo, limpar ajuste manual; se alterar ajuste, não alterar saldo alvo
        if (name === 'saldoAtual') {
          setForm({ ...form, saldoAtual: parsedValue, ajusteSaldo: isEditing ? 0 : form.ajusteSaldo });
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

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({ ...prev, tipo: value }));
  };

  const doCreate = async () => {
    const createPayload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      saldo: Number(form.saldoAtual) || 0,
    } as const;
    await createAccountMutation.mutateAsync(createPayload as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação manual para campos obrigatórios
    const errors: Record<string, string> = {};
    
    if (!form.nome.trim()) {
      errors.nome = 'Nome obrigatório';
    }
    
    if (!form.tipo) {
      errors.tipo = 'Tipo obrigatório';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Validação client-side com Zod
    const result = accountSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }
    
    try {
      if (initialData && initialData.id) {
        // Para atualização, usar o formato esperado pelo hook
        const updatePayload = {
          nome: form.nome.trim(),
          tipo: form.tipo,
          saldoAtual: Number(form.saldoAtual) || 0,
          // Precedência: se definiu saldo alvo diferente do atual, ignorar ajuste manual para evitar duplicação
          ajusteSaldo: targetChanged ? 0 : (typeof form.ajusteSaldo === 'string' ? parseFloat(form.ajusteSaldo) || 0 : (Number(form.ajusteSaldo) || 0)),
        } as const;
        await updateAccountMutation.mutateAsync({ id: initialData.id, data: updatePayload } as any);
      } else {
        // Confirmação: criar transação de ajuste se saldo inicial != 0 e não for cartão de crédito
        const requiresConfirm = (Number(form.saldoAtual) || 0) !== 0 && form.tipo !== 'cartão de crédito';
        if (requiresConfirm && process.env.NODE_ENV !== 'test') {
          confirmation.confirm(
            {
              title: 'Criar conta com saldo inicial',
              message: 'Será criada uma transação de ajuste pela diferença até atingir o saldo inicial definido. Deseja continuar?',
              confirmText: 'Continuar',
              cancelText: 'Cancelar',
            },
            () => { void doCreate().then(() => onSuccess?.()); }
          );
          return;
        }
        await doCreate();
      }
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao guardar conta:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <Input
        name="nome"
        placeholder="Nome da Conta"
        value={form.nome}
        onChange={handleChange}
        required
        className="w-full"
        aria-invalid={!!validationErrors.nome}
        aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
      />
      {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm">{validationErrors.nome}</div>}
      
      <Select value={form.tipo} onValueChange={handleTipoChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Tipo de Conta" />
        </SelectTrigger>
        <SelectContent>
          {tiposConta.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {validationErrors.tipo && <div className="text-red-600 text-sm">{validationErrors.tipo}</div>}
      
      {/* Mensagem informativa para cartões de crédito */}
      {form.tipo === 'cartão de crédito' && (
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Cartões de crédito começam com saldo 0€. O saldo negativo representa o valor em dívida.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Campo opcional para saldo atual - visível sempre */}
      <div className="space-y-1">
        <Input
          name="saldoAtual"
          type="text"
          placeholder="Saldo Atual (€) - Opcional"
          value={form.saldoAtual?.toString() || ''}
          onChange={handleChange}
          className="w-full"
          disabled={isEditing && hasManualAdjustment}
          aria-invalid={!!validationErrors.saldoAtual}
          aria-describedby={validationErrors.saldoAtual ? 'saldoAtual-error' : undefined}
        />
        {validationErrors.saldoAtual && <div id="saldoAtual-error" className="text-red-600 text-sm">{validationErrors.saldoAtual}</div>}
        {/* Dica contextual: ajuste pela diferença */}
        <div className="text-xs text-muted-foreground">
          Ao guardar, será aplicada uma transação de ajuste pela diferença para atingir este saldo.
          {isEditing && targetChanged && (
            <>
              {' '}Diferença: {((Number(form.saldoAtual) || 0) - initialCurrentBalance).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </>
          )}
          {isEditing && hasManualAdjustment && (
            <span className="block">Desativado porque definiu um ajuste manual.</span>
          )}
        </div>
      </div>
      
      {/* Campo opcional para ajuste de saldo - apenas visível quando editando */}
      {initialData?.id && (
        <>
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
          <div className="text-xs text-muted-foreground">
            Aplica um ajuste direto ao saldo atual. {targetChanged && 'Desativado porque definiu um novo saldo alvo.'}
          </div>
        </>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <FormSubmitButton 
          isSubmitting={isSubmitting}
          submitText={initialData?.id ? 'Atualizar' : 'Criar'}
          submittingText={initialData?.id ? 'A atualizar...' : 'A criar...'}
          className="w-full"
        />
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        variant={confirmation.options.variant}
      />
    </form>
  );
};

export default AccountForm;