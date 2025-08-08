import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateAccount, useCreateAccount } from '../hooks/useAccountsQuery';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { Alert, AlertDescription } from './ui/alert';
import { CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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
  const [form, setForm] = useState<CreditCardFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateAccountMutation = useUpdateAccount();
  const createAccountMutation = useCreateAccount();
  
  const isEditing = Boolean(initialData.id);
  const isSubmitting = isEditing ? updateAccountMutation.isPending : createAccountMutation.isPending;

  console.log('[CreditCardForm] initialData:', initialData);
  console.log('[CreditCardForm] form state:', form);
  console.log('[CreditCardForm] isSubmitting:', isSubmitting);

  useEffect(() => {
    console.log('[CreditCardForm] useEffect triggered with initialData:', initialData);
    if (initialData) {
      console.log('[CreditCardForm] Setting form data:', initialData);
      setForm(initialData);
      
      // Para cartões de crédito, buscar o saldo correto da conta
      if (initialData.tipo === 'cartão de crédito') {
        fetchAccountBalance();
      }
    }
  }, [initialData]);

  const fetchAccountBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('saldo')
        .eq('id', initialData.id)
        .single();
      
      if (error) {
        console.error('[CreditCardForm] Error fetching account balance:', error);
        return;
      }
      
      console.log('[CreditCardForm] Account balance from database:', data.saldo);
      
      // Atualizar o saldoAtual com o valor correto da base de dados
      setForm(prev => ({
        ...prev,
        saldoAtual: data.saldo || 0
      }));
    } catch (error) {
      console.error('[CreditCardForm] Error fetching account balance:', error);
    }
  };

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
        setForm({ ...form, [name]: parsedValue });
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
        saldoAtual,
        ajusteSaldo,
      };
      
      console.log('[CreditCardForm] Form values:', form);
      console.log('[CreditCardForm] Parsed values - saldoAtual:', saldoAtual, 'ajusteSaldo:', ajusteSaldo);
      console.log('[CreditCardForm] Submitting payload:', payload);
      console.log('[CreditCardForm] Is editing:', isEditing);
      console.log('[CreditCardForm] Account ID:', form.id);
      
      let result;
      if (isEditing) {
        result = await updateAccountMutation.mutateAsync({ id: form.id, data: payload });
      } else {
        result = await createAccountMutation.mutateAsync(payload);
      }
      console.log('[CreditCardForm] Update result:', result);
      
      // Aguardar um pouco para garantir que as queries foram atualizadas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao guardar cartão de crédito:', err);
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