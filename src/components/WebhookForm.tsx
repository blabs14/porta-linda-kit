import { useState } from 'react';
import { webhookSchema } from '../validation/webhookSchema';
import { createWebhook, updateWebhook } from '../services/webhooks';
import { showError } from '../lib/utils';

interface WebhookFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function WebhookForm({ initialData, onSuccess, onCancel }: WebhookFormProps) {
  const [form, setForm] = useState({
    id: initialData?.id || '',
    url: initialData?.url || '',
    event: initialData?.event || '',
    active: initialData?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const result = webhookSchema.safeParse({
      url: form.url,
      event: form.event,
      active: form.active,
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
        url: form.url,
        event: form.event,
        active: form.active,
      };
      let res;
      if (form.id) {
        res = await updateWebhook(form.id, payload);
      } else {
        res = await createWebhook(payload);
      }
      setLoading(false);
      if (res.error) {
        showError(res.error.message);
      } else {
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', url: '', event: '', active: true });
      }
    } catch (err: any) {
      showError('Erro ao guardar webhook');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <input
        name="url"
        placeholder="URL"
        value={form.url}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.url}
        aria-describedby={validationErrors.url ? 'url-error' : undefined}
      />
      {validationErrors.url && <div id="url-error" className="text-red-600 text-sm">{validationErrors.url}</div>}
      <input
        name="event"
        placeholder="Evento"
        value={form.event}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.event}
        aria-describedby={validationErrors.event ? 'event-error' : undefined}
      />
      {validationErrors.event && <div id="event-error" className="text-red-600 text-sm">{validationErrors.event}</div>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={handleChange}
        />
        Ativo
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