import { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../services/accounts';
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
  saldo_inicial: number;
};

interface AccountFormProps {
  initialData?: AccountFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountForm = ({ initialData, onSuccess, onCancel }: AccountFormProps) => {
  const [form, setForm] = useState<AccountFormData>(
    initialData || { nome: '', tipo: '', saldo_inicial: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setLoading(true);
    try {
      if (form.id) {
        const { error } = await updateAccount(form.id, {
          nome: form.nome,
          tipo: form.tipo,
          saldo_inicial: Number(form.saldo_inicial),
        });
        if (error) throw error;
      } else {
        const { error } = await createAccount({
          nome: form.nome,
          tipo: form.tipo,
          saldo_inicial: Number(form.saldo_inicial),
        });
        if (error) throw error;
      }
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar conta');
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
      />
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
      <Input
        name="saldo_inicial"
        type="number"
        placeholder="Saldo Inicial"
        value={form.saldo_inicial}
        onChange={handleChange}
        required
        min={0}
        className="w-full"
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
      </div>
    </form>
  );
};

export default AccountForm;