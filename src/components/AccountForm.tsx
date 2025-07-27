import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountSchema } from '../validation/accountSchema';
import { showError, showSuccess } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { useCreateAccount, useUpdateAccount } from '../hooks/useAccountsQuery';

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupança', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'outro', label: 'Outro' },
];

export type AccountFormData = {
  id?: string;
  nome: string;
  tipo: string;
  saldo?: number;
};

interface AccountFormProps {
  initialData?: AccountFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountForm = ({ initialData, onSuccess, onCancel }: AccountFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<AccountFormData>(
    initialData || { nome: '', tipo: '', saldo: 0 }
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  
  const loading = createAccountMutation.isPending || updateAccountMutation.isPending;

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'saldo') {
      // Permitir apenas números e vírgula/ponto
      const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      setForm({ ...form, [name]: numericValue ? parseFloat(numericValue) || 0 : 0 });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({ ...prev, tipo: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
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
        nome: form.nome,
        tipo: form.tipo,
        saldo: form.saldo || 0,
      };
      
      if (initialData && initialData.id) {
        await updateAccountMutation.mutateAsync({ id: initialData.id, data: payload });
        showSuccess('Conta atualizada com sucesso!');
      } else {
        await createAccountMutation.mutateAsync(payload);
        showSuccess('Conta criada com sucesso!');
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao guardar conta:', err);
      showError(err.message || 'Erro ao guardar conta');
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
        name="saldo"
        type="text"
        placeholder="Saldo Inicial (€) - Opcional"
        value={form.saldo?.toString() || '0'}
        onChange={handleChange}
        className="w-full"
        aria-invalid={!!validationErrors.saldo}
        aria-describedby={validationErrors.saldo ? 'saldo-error' : undefined}
      />
      {validationErrors.saldo && <div id="saldo-error" className="text-red-600 text-sm">{validationErrors.saldo}</div>}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>
    </form>
  );
};

export default AccountForm;