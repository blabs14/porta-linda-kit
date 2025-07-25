import { useState, useEffect } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { getCategories } from '../services/categories';
import { transactionSchema } from '../validation/transactionSchema';
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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: '',
    account_id: '',
    valor: '',
    categoria_id: '',
    data: '',
    descricao: '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAccounts().then(({ data }) => {
      if (data) setAccounts(data);
    });
    getCategories().then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id || '',
        account_id: initialData.account_id || '',
        valor: initialData.valor?.toString() || '',
        categoria_id: initialData.categoria_id || '',
        data: initialData.data || '',
        descricao: initialData.descricao || '',
      });
    } else {
      setForm({ id: '', account_id: '', valor: '', categoria_id: '', data: '', descricao: '' });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContaChange = (value: string) => {
    setForm((prev) => ({ ...prev, account_id: value }));
  };

  const handleCategoriaChange = (value: string) => {
    setForm((prev) => ({ ...prev, categoria_id: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setValidationErrors({});
    const result = transactionSchema.safeParse({
      account_id: form.account_id,
      valor: form.valor,
      categoria_id: form.categoria_id,
      data: form.data,
      descricao: form.descricao,
    });
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
        account_id: form.account_id,
        valor: Number(form.valor),
        categoria_id: form.categoria_id,
        data: form.data,
        descricao: form.descricao,
      };
      let res;
      if (form.id) {
        res = await update(form.id, payload, user?.id || '');
      } else {
        res = await create(payload, user?.id || '');
      }
      setLoading(false);
      if (res.error) {
        showError(res.error.message);
      } else {
        setSuccess(true);
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', account_id: '', valor: '', categoria_id: '', data: '', descricao: '' });
      }
    } catch (err: any) {
      showError('Erro ao guardar transação');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <Select value={form.account_id} onValueChange={handleContaChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>{acc.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {validationErrors.account_id && <div className="text-red-600 text-sm">{validationErrors.account_id}</div>}
      <Input
        name="valor"
        type="number"
        placeholder="Valor"
        value={form.valor}
        onChange={handleChange}
        required
        min={0}
        className="w-full"
        aria-invalid={!!validationErrors.valor}
        aria-describedby={validationErrors.valor ? 'valor-error' : undefined}
      />
      {validationErrors.valor && <div id="valor-error" className="text-red-600 text-sm">{validationErrors.valor}</div>}
      <Select value={form.categoria_id} onValueChange={handleCategoriaChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {validationErrors.categoria_id && <div className="text-red-600 text-sm">{validationErrors.categoria_id}</div>}
      <Input
        name="data"
        type="date"
        placeholder="Data"
        value={form.data}
        onChange={handleChange}
        required
        className="w-full"
        aria-invalid={!!validationErrors.data}
        aria-describedby={validationErrors.data ? 'data-error' : undefined}
      />
      {validationErrors.data && <div id="data-error" className="text-red-600 text-sm">{validationErrors.data}</div>}
      <Input
        name="descricao"
        placeholder="Descrição"
        value={form.descricao}
        onChange={handleChange}
        className="w-full"
        aria-invalid={!!validationErrors.descricao}
        aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
      />
      {validationErrors.descricao && <div id="descricao-error" className="text-red-600 text-sm">{validationErrors.descricao}</div>}
      {success && <div className="text-green-600 text-sm">Transação guardada com sucesso!</div>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>}
      </div>
    </form>
  );
};

export default TransactionForm;