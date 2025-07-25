import { useState, useRef } from 'react';
import { profileSchema } from '../validation/profileSchema';
import { updateProfile } from '../services/profiles';
import { showError } from '../lib/utils';

interface ProfileFormProps {
  initialData: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProfileForm({ initialData, onSuccess, onCancel }: ProfileFormProps) {
  const [form, setForm] = useState({
    id: initialData?.id || '',
    nome: initialData?.nome || '',
    foto_url: initialData?.foto_url || '',
    percentual_divisao: initialData?.percentual_divisao?.toString() || '',
    poupanca_mensal: initialData?.poupanca_mensal?.toString() || '',
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
    const result = profileSchema.safeParse({
      nome: form.nome,
      foto_url: form.foto_url,
      percentual_divisao: form.percentual_divisao,
      poupanca_mensal: form.poupanca_mensal,
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
        foto_url: form.foto_url,
        percentual_divisao: form.percentual_divisao ? Number(form.percentual_divisao) : undefined,
        poupanca_mensal: form.poupanca_mensal ? Number(form.poupanca_mensal) : undefined,
      };
      const { error } = await updateProfile(form.id, payload);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showError('Erro ao guardar perfil');
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
          placeholder="Nome completo"
          value={form.nome}
          onChange={handleChange}
          required
          ref={nomeRef}
          autoFocus
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.nome}
          aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
        />
        <small>O teu nome real.</small>
        {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.nome}</div>}
      </div>
      <div>
        <label htmlFor="foto_url">URL da Foto</label>
        <input
          id="foto_url"
          name="foto_url"
          placeholder="URL da foto de perfil"
          value={form.foto_url}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.foto_url}
          aria-describedby={validationErrors.foto_url ? 'foto-url-error' : undefined}
        />
        <small>Link para uma imagem (opcional).</small>
        {validationErrors.foto_url && <div id="foto-url-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.foto_url}</div>}
      </div>
      <div>
        <label htmlFor="percentual_divisao">% Divisão</label>
        <input
          id="percentual_divisao"
          name="percentual_divisao"
          type="number"
          placeholder="% Divisão (0-100)"
          value={form.percentual_divisao}
          onChange={handleChange}
          min={0}
          max={100}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.percentual_divisao}
          aria-describedby={validationErrors.percentual_divisao ? 'percentual-divisao-error' : undefined}
        />
        <small>Percentagem da divisão de despesas.</small>
        {validationErrors.percentual_divisao && <div id="percentual-divisao-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.percentual_divisao}</div>}
      </div>
      <div>
        <label htmlFor="poupanca_mensal">Poupança Mensal (€)</label>
        <input
          id="poupanca_mensal"
          name="poupanca_mensal"
          type="number"
          placeholder="Poupança Mensal (€)"
          value={form.poupanca_mensal}
          onChange={handleChange}
          min={0}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.poupanca_mensal}
          aria-describedby={validationErrors.poupanca_mensal ? 'poupanca-mensal-error' : undefined}
        />
        <small>Quanto pretendes poupar por mês.</small>
        {validationErrors.poupanca_mensal && <div id="poupanca-mensal-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.poupanca_mensal}</div>}
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