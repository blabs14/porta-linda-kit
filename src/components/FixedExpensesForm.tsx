import { useEffect, useState } from 'react';
import { createFixedExpense, updateFixedExpense } from '../services/fixed_expenses';
import { getCategories } from '../services/categories';
import { fixedExpenseSchema } from '../validation/fixedExpenseSchema';
import { showError } from '../lib/utils';

interface FixedExpensesFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FixedExpensesForm({ initialData, onSuccess, onCancel }: FixedExpensesFormProps) {
  const [form, setForm] = useState({
    id: '',
    nome: '',
    valor: '',
    dia_vencimento: '',
    categoria_id: '',
    ativa: true,
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getCategories().then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id || '',
        nome: initialData.nome || '',
        valor: initialData.valor?.toString() || '',
        dia_vencimento: initialData.dia_vencimento?.toString() || '',
        categoria_id: initialData.categoria_id || '',
        ativa: initialData.ativa ?? true,
      });
    } else {
      setForm({ id: '', nome: '', valor: '', dia_vencimento: '', categoria_id: '', ativa: true });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);
    const result = fixedExpenseSchema.safeParse({
      nome: form.nome,
      valor: form.valor,
      dia_vencimento: form.dia_vencimento,
      categoria_id: form.categoria_id,
      ativa: form.ativa,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      setLoading(false);
      return;
    }
    try {
      const payload = {
        nome: form.nome,
        valor: Number(form.valor),
        dia_vencimento: Number(form.dia_vencimento),
        categoria_id: form.categoria_id,
        ativa: form.ativa,
      };
      let res;
      if (form.id) {
        res = await updateFixedExpense(form.id, payload);
      } else {
        res = await createFixedExpense(payload);
      }
      setLoading(false);
      if (res.error) {
        showError(res.error.message);
      } else {
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', nome: '', valor: '', dia_vencimento: '', categoria_id: '', ativa: true });
      }
    } catch (err: any) {
      showError('Erro ao guardar despesa fixa');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <input
        name="nome"
        placeholder="Nome"
        value={form.nome}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.nome}
        aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
      />
      {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm">{validationErrors.nome}</div>}
      <input
        name="valor"
        type="number"
        placeholder="Valor"
        value={form.valor}
        onChange={handleChange}
        required
        min={0}
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.valor}
        aria-describedby={validationErrors.valor ? 'valor-error' : undefined}
      />
      {validationErrors.valor && <div id="valor-error" className="text-red-600 text-sm">{validationErrors.valor}</div>}
      <input
        name="dia_vencimento"
        type="number"
        placeholder="Dia de Vencimento (1-31)"
        value={form.dia_vencimento}
        onChange={handleChange}
        required
        min={1}
        max={31}
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.dia_vencimento}
        aria-describedby={validationErrors.dia_vencimento ? 'dia-vencimento-error' : undefined}
      />
      {validationErrors.dia_vencimento && <div id="dia-vencimento-error" className="text-red-600 text-sm">{validationErrors.dia_vencimento}</div>}
      <select
        name="categoria_id"
        value={form.categoria_id}
        onChange={handleChange}
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.categoria_id}
        aria-describedby={validationErrors.categoria_id ? 'categoria-id-error' : undefined}
      >
        <option value="">Categoria</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.nome}</option>
        ))}
      </select>
      {validationErrors.categoria_id && <div id="categoria-id-error" className="text-red-600 text-sm">{validationErrors.categoria_id}</div>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="ativa"
          checked={form.ativa}
          onChange={handleChange}
        />
        Ativa
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" disabled={loading} className="w-full bg-primary text-white rounded p-2">
          {loading ? 'A guardar...' : 'Guardar'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="w-full border rounded p-2">Cancelar</button>}
      </div>
    </form>
  );
} 