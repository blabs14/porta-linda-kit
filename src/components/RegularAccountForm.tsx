import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateAccount } from '../hooks/useAccountsQuery';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

interface RegularAccountFormData {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual?: number;
  ajusteSaldo?: number | string;
}

interface RegularAccountFormProps {
  initialData: RegularAccountFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupança', label: 'Conta Poupança' },
  { value: 'investimento', label: 'Conta Investimento' },
  { value: 'outro', label: 'Outro' },
];

const RegularAccountForm = ({ initialData, onSuccess, onCancel }: RegularAccountFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<RegularAccountFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateAccountMutation = useUpdateAccount();
  
  const isSubmitting = updateAccountMutation.isPending;

  console.log('[RegularAccountForm] initialData:', initialData);
  console.log('[RegularAccountForm] form state:', form);
  console.log('[RegularAccountForm] isSubmitting:', isSubmitting);

  useEffect(() => {
    console.log('[RegularAccountForm] useEffect triggered with initialData:', initialData);
    if (initialData) {
      console.log('[RegularAccountForm] Setting form with:', initialData);
      setForm(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('[RegularAccountForm] handleChange:', { name, value, currentForm: form });
    
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
      console.log('[RegularAccountForm] Updating form with:', { ...form, [name]: value });
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
    
    try {
      // Se apenas nome e tipo foram alterados, enviar apenas esses campos
      const hasSaldoChanges = form.saldoAtual !== initialData.saldoAtual || 
                             (form.ajusteSaldo !== undefined && form.ajusteSaldo !== 0);
      
      const payload = hasSaldoChanges ? {
        nome: form.nome.trim(),
        tipo: form.tipo,
        saldoAtual: Number(form.saldoAtual) || 0,
        ajusteSaldo: typeof form.ajusteSaldo === 'string' ? parseFloat(form.ajusteSaldo) || 0 : (Number(form.ajusteSaldo) || 0),
      } : {
        nome: form.nome.trim(),
        tipo: form.tipo,
      };
      
      console.log('[RegularAccountForm] Sending payload:', payload);
      await updateAccountMutation.mutateAsync({ id: form.id, data: payload });
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao guardar conta:', err);
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
          submitText="Atualizar"
          submittingText="A atualizar..."
          className="w-full"
        />
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>
    </form>
  );
};

export default RegularAccountForm; 