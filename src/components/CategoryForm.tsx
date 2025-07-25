import { useState, useRef } from 'react';
import { categorySchema } from '../validation/categorySchema';
import { showError } from '../lib/utils';
// Supondo que existam funções createCategory e updateCategory
// import { createCategory, updateCategory } from '../services/categories';

interface CategoryFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  onSubmitCategory: (data: { nome: string; descricao?: string }) => Promise<{ error?: any }>;
}

export default function CategoryForm({ initialData, onSuccess, onCancel, onSubmitCategory }: CategoryFormProps) {
  const [form, setForm] = useState({
    id: initialData?.id || '',
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const nomeRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);
    const result = categorySchema.safeParse({
      nome: form.nome,
      descricao: form.descricao,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      setLoading(false);
      if (fieldErrors.nome) nomeRef.current?.focus();
      return;
    }
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
      };
      const { error } = await onSubmitCategory(payload);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', nome: '', descricao: '' });
      }
    } catch (err: any) {
      showError('Erro ao guardar categoria');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <div>
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          name="nome"
          placeholder="Nome da categoria"
          value={form.nome}
          onChange={handleChange}
          required
          ref={nomeRef}
          autoFocus
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.nome}
          aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
        />
        <small>Exemplo: Alimentação, Lazer, etc.</small>
        {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.nome}</div>}
      </div>
      <div>
        <label htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          name="descricao"
          placeholder="Descrição (opcional)"
          value={form.descricao}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.descricao}
          aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
        />
        <small>Breve descrição da categoria.</small>
        {validationErrors.descricao && <div id="descricao-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.descricao}</div>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" disabled={loading} className="w-full bg-primary text-white rounded p-2">
          {loading ? 'A guardar...' : 'Guardar'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="w-full border rounded p-2">Cancelar</button>}
      </div>
    </form>
  );
} 