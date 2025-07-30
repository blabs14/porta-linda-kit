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

interface AccountFormData {
  id?: string;
  nome: string;
  tipo: string;
  saldoAtual?: number;
  ajusteSaldo?: number;
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
  { value: 'cartão de crédito', label: 'Cartão de Crédito' },
  { value: 'outro', label: 'Outro' },
];

const AccountForm = ({ initialData, onSuccess, onCancel }: AccountFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<AccountFormData>(
    initialData || { nome: '', tipo: '', saldoAtual: 0, ajusteSaldo: 0 }
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  
  const isSubmitting = createAccountMutation.isPending || updateAccountMutation.isPending;

  console.log('[AccountForm] initialData:', initialData);
  console.log('[AccountForm] form state:', form);
  console.log('[AccountForm] isSubmitting:', isSubmitting);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'saldoAtual' || name === 'ajusteSaldo') {
      // Permitir números negativos, positivos e vírgula/ponto
      // Manter o sinal negativo se presente
      const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      // Permitir valores vazios para ajusteSaldo
      if (name === 'ajusteSaldo' && value === '') {
        setForm({ ...form, [name]: 0 });
      } else {
        setForm({ ...form, [name]: numericValue ? parseFloat(numericValue) || 0 : 0 });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({ ...prev, tipo: value }));
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
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        saldoAtual: Number(form.saldoAtual) || 0,
        ajusteSaldo: Number(form.ajusteSaldo) || 0,
      };
      
      if (initialData && initialData.id) {
        await updateAccountMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createAccountMutation.mutateAsync(payload);
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
      

      
      {/* Campos opcionais para edição - apenas visíveis quando editando */}
      {initialData?.id && (
        <>
          <Input
            name="saldoAtual"
            type="text"
            placeholder="Saldo Atual (€) - Opcional"
            value={form.saldoAtual?.toString() || ''}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.saldoAtual}
            aria-describedby={validationErrors.saldoAtual ? 'saldoAtual-error' : undefined}
          />
          {validationErrors.saldoAtual && <div id="saldoAtual-error" className="text-red-600 text-sm">{validationErrors.saldoAtual}</div>}
          
          <Input
            name="ajusteSaldo"
            type="text"
            placeholder="Ajuste de Saldo (+/- €) - Opcional"
            value={form.ajusteSaldo?.toString() || ''}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.ajusteSaldo}
            aria-describedby={validationErrors.ajusteSaldo ? 'ajusteSaldo-error' : undefined}
          />
          {validationErrors.ajusteSaldo && <div id="ajusteSaldo-error" className="text-red-600 text-sm">{validationErrors.ajusteSaldo}</div>}
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
    </form>
  );
};

export default AccountForm;