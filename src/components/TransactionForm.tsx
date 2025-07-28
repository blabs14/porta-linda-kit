import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReferenceData } from '../hooks/useCache';
import { useCreateTransaction, useUpdateTransaction } from '../hooks/useTransactionsQuery';
import { transactionSchema } from '../validation/transactionSchema';
import { showError, showSuccess } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading-states';
import { CategorySelect } from './CategorySelect';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

interface TransactionFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TransactionForm = ({ initialData, onSuccess, onCancel }: TransactionFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    id: '',
    account_id: '',
    valor: '',
    categoria_id: '',
    data: '',
    descricao: '',
    tipo: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Usar React Query mutations
  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();

  // Usar dados de referência do cache
  const { accounts, categories } = useReferenceData();

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id || '',
        account_id: initialData.account_id || '',
        valor: initialData.valor?.toString() || '',
        categoria_id: initialData.categoria_id || '',
        data: initialData.data || '',
        descricao: initialData.descricao || '',
        tipo: initialData.tipo || '',
      });
    } else {
      setForm({ id: '', account_id: '', valor: '', categoria_id: '', data: '', descricao: '', tipo: '' });
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

  const handleTipoChange = (value: string) => {
    setForm((prev) => ({ ...prev, tipo: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setValidationErrors({});
    
    // Validação client-side
    const result = transactionSchema.safeParse({
      account_id: form.account_id,
      valor: form.valor,
      categoria_id: form.categoria_id,
      data: form.data,
      descricao: form.descricao,
      tipo: form.tipo,
    });
    
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
        account_id: form.account_id,
        valor: Number(form.valor),
        categoria_id: form.categoria_id,
        data: form.data,
        descricao: form.descricao,
        tipo: form.tipo,
      };
      
      if (form.id) {
        // Atualizar transação existente
        await updateTransactionMutation.mutateAsync({ id: form.id, data: payload });
        showSuccess('Transação atualizada com sucesso!');
      } else {
        // Criar nova transação
        await createTransactionMutation.mutateAsync(payload);
        showSuccess('Transação criada com sucesso!');
      }
      
      setSuccess(true);
      if (onSuccess) onSuccess();
      if (!form.id) setForm({ id: '', account_id: '', valor: '', categoria_id: '', data: '', descricao: '', tipo: '' });
    } catch (err: any) {
      console.error('Erro ao guardar transação:', err);
      showError(err.message || 'Erro ao guardar transação');
    }
  };

  const isLoading = createTransactionMutation.isPending || updateTransactionMutation.isPending;
  const dataLoading = accounts.isLoading || categories.isLoading;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <Select value={form.account_id} onValueChange={handleContaChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          {accounts.data?.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>{acc.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {validationErrors.account_id && <div className="text-red-600 text-sm">{validationErrors.account_id}</div>}
      
      <Select value={form.tipo} onValueChange={handleTipoChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Tipo de Transação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="receita">Receita</SelectItem>
          <SelectItem value="despesa">Despesa</SelectItem>
        </SelectContent>
      </Select>
      {validationErrors.tipo && <div className="text-red-600 text-sm">{validationErrors.tipo}</div>}
      
      <Input
        name="valor"
        type="number"
        placeholder="Valor"
        value={form.valor}
        onChange={handleChange}
        required
        step="0.01"
        className="w-full"
        aria-invalid={!!validationErrors.valor}
        aria-describedby={validationErrors.valor ? 'valor-error' : undefined}
      />
      {validationErrors.valor && <div id="valor-error" className="text-red-600 text-sm">{validationErrors.valor}</div>}
      
      <CategorySelect
        value={form.categoria_id}
        onValueChange={handleCategoriaChange}
        placeholder="Selecionar categoria..."
      />
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
        placeholder="Descrição (opcional)"
        value={form.descricao}
        onChange={handleChange}
        className="w-full"
        aria-invalid={!!validationErrors.descricao}
        aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
      />
      {validationErrors.descricao && <div id="descricao-error" className="text-red-600 text-sm">{validationErrors.descricao}</div>}
      
      {success && <div className="text-green-600 text-sm">Transação guardada com sucesso!</div>}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              A guardar...
            </>
          ) : (
            'Guardar'
          )}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>}
      </div>
    </form>
  );
};

export default TransactionForm;