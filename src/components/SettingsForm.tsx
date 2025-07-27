import { useState, useRef } from 'react';
import { settingsSchema } from '../validation/settingsSchema';
import { showError } from '../lib/utils';
import { Button } from './ui/button';
// Supondo que exista uma função onSubmitSettings para guardar as definições

interface SettingsFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  onSubmitSettings: (data: { idioma?: string; moeda?: string; notificacoes?: boolean }) => Promise<{ error?: any }>;
}

export default function SettingsForm({ initialData, onSuccess, onCancel, onSubmitSettings }: SettingsFormProps) {
  const [form, setForm] = useState({
    idioma: initialData?.idioma || '',
    moeda: initialData?.moeda || '',
    notificacoes: initialData?.notificacoes ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const idiomaRef = useRef<HTMLSelectElement>(null);

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
    const result = settingsSchema.safeParse({
      idioma: form.idioma,
      moeda: form.moeda,
      notificacoes: form.notificacoes,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      setLoading(false);
      if (fieldErrors.idioma) idiomaRef.current?.focus();
      return;
    }
    try {
      const payload = {
        idioma: form.idioma,
        moeda: form.moeda,
        notificacoes: form.notificacoes,
      };
      const { error } = await onSubmitSettings(payload);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showError('Erro ao guardar definições');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <div>
        <label htmlFor="idioma">Idioma</label>
        <select
          id="idioma"
          name="idioma"
          value={form.idioma}
          onChange={handleChange}
          ref={idiomaRef}
          autoFocus
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.idioma}
          aria-describedby={validationErrors.idioma ? 'idioma-error' : undefined}
        >
          <option value="">Idioma</option>
          <option value="pt">Português</option>
          <option value="en">Inglês</option>
          {/* Adiciona outros idiomas conforme necessário */}
        </select>
        <small>Idioma preferido da aplicação.</small>
        {validationErrors.idioma && <div id="idioma-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.idioma}</div>}
      </div>
      <div>
        <label htmlFor="moeda">Moeda</label>
        <select
          id="moeda"
          name="moeda"
          value={form.moeda}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.moeda}
          aria-describedby={validationErrors.moeda ? 'moeda-error' : undefined}
        >
          <option value="">Moeda</option>
          <option value="EUR">Euro (€)</option>
          <option value="USD">Dólar ($)</option>
          {/* Adiciona outras moedas conforme necessário */}
        </select>
        <small>Moeda padrão para os valores.</small>
        {validationErrors.moeda && <div id="moeda-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.moeda}</div>}
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="notificacoes"
          checked={form.notificacoes}
          onChange={handleChange}
        />
        Ativar notificações
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A guardar...' : 'Guardar'}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>}
      </div>
    </form>
  );
} 