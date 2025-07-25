import { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../services/accounts';
import { accountSchema } from '../validation/accountSchema';
import { showError } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
];

export type AccountFormData = {
  id?: string;
  nome: string;
  tipo: string;
};

interface AccountFormProps {
  initialData?: AccountFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountForm = ({ initialData, onSuccess, onCancel }: AccountFormProps) => {
  const [form, setForm] = useState<AccountFormData>(
    initialData || { nome: '', tipo: '' }
  );
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({ ...prev, tipo: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    const result = accountSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
      };
      if (initialData && initialData.id) {
        const { error } = await updateAccount(initialData.id, payload);
        if (error) throw error;
      } else {
        const { error } = await createAccount(payload);
        if (error) throw error;
      }
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar conta');
      setLoading(false);
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
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>
    </form>
  );
};

export default AccountForm;