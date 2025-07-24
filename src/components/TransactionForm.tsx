import { useState, useEffect } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { getAccounts } from '../services/accounts';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

const categorias = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Outros',
];

interface TransactionFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TransactionForm = ({ initialData, onSuccess, onCancel }: TransactionFormProps) => {
  const { create, update } = useTransactions();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: '',
    conta_id: '',
    valor: '',
    categoria: '',
    data: '',
    descricao: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAccounts().then(({ data }) => {
      if (data) setAccounts(data);
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id || '',
        conta_id: initialData.conta_id || '',
        valor: initialData.valor?.toString() || '',
        categoria: initialData.categoria || '',
        data: initialData.data || '',
        descricao: initialData.descricao || '',
      });
    } else {
      setForm({ id: '', conta_id: '', valor: '', categoria: '', data: '', descricao: '' });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContaChange = (value: string) => {
    setForm((prev) => ({ ...prev, conta_id: value }));
  };

  const handleCategoriaChange = (value: string) => {
    setForm((prev) => ({ ...prev, categoria: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const payload = {
        conta_id: form.conta_id,
        valor: Number(form.valor),
        categoria: form.categoria,
        data: form.data,
        descricao: form.descricao,
      };
      let res;
      if (form.id) {
        res = await update(form.id, payload);
      } else {
        res = await create(payload);
      }
      setLoading(false);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccess(true);
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', conta_id: '', valor: '', categoria: '', data: '', descricao: '' });
      }
    } catch (err: any) {
      setError('Erro ao guardar transação');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <Select value={form.conta_id} onValueChange={handleContaChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>{acc.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        name="valor"
        type="number"
        placeholder="Valor"
        value={form.valor}
        onChange={handleChange}
        required
        min={0}
        className="w-full"
      />
      <Select value={form.categoria} onValueChange={handleCategoriaChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {categorias.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        name="data"
        type="date"
        placeholder="Data"
        value={form.data}
        onChange={handleChange}
        required
        className="w-full"
      />
      <Input
        name="descricao"
        placeholder="Descrição"
        value={form.descricao}
        onChange={handleChange}
        className="w-full"
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Transação guardada com sucesso!</div>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>}
      </div>
    </form>
  );
};

export default TransactionForm;