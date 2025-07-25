import { useState } from 'react';
import { notificationSchema } from '../validation/notificationSchema';
import { createNotification } from '../services/notifications';
import { showError } from '../lib/utils';

interface NotificationFormProps {
  user_id: string;
  family_id?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NotificationForm({ user_id, family_id, initialData, onSuccess, onCancel }: NotificationFormProps) {
  const [form, setForm] = useState({
    type: initialData?.type || '',
    message: initialData?.message || '',
    read: initialData?.read ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    const result = notificationSchema.safeParse({
      user_id,
      family_id,
      type: form.type,
      message: form.message,
      read: form.read,
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
        user_id,
        family_id,
        type: form.type,
        message: form.message,
        read: form.read,
      };
      const { error } = await createNotification(payload);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        if (onSuccess) onSuccess();
        setForm({ type: '', message: '', read: false });
      }
    } catch (err: any) {
      showError('Erro ao guardar notificação');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <input
        name="type"
        placeholder="Tipo"
        value={form.type}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.type}
        aria-describedby={validationErrors.type ? 'type-error' : undefined}
      />
      {validationErrors.type && <div id="type-error" className="text-red-600 text-sm">{validationErrors.type}</div>}
      <textarea
        name="message"
        placeholder="Mensagem"
        value={form.message}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.message}
        aria-describedby={validationErrors.message ? 'message-error' : undefined}
        rows={3}
      />
      {validationErrors.message && <div id="message-error" className="text-red-600 text-sm">{validationErrors.message}</div>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="read"
          checked={form.read}
          onChange={handleChange}
        />
        Lida
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