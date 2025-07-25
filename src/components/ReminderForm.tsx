import { useState } from 'react';
import { reminderSchema } from '../validation/reminderSchema';
import { createReminder, updateReminder } from '../services/reminders';
import { showError } from '../lib/utils';

interface ReminderFormProps {
  user_id: string;
  family_id?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReminderForm({ user_id, family_id, initialData, onSuccess, onCancel }: ReminderFormProps) {
  const [form, setForm] = useState({
    id: initialData?.id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    date: initialData?.date || '',
    recurring: initialData?.recurring ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const result = reminderSchema.safeParse({
      user_id,
      family_id,
      title: form.title,
      description: form.description,
      date: form.date,
      recurring: form.recurring,
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
        title: form.title,
        description: form.description,
        date: form.date,
        recurring: form.recurring,
      };
      let res;
      if (form.id) {
        res = await updateReminder(form.id, payload);
      } else {
        res = await createReminder(payload);
      }
      setLoading(false);
      if (res.error) {
        showError(res.error.message);
      } else {
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', title: '', description: '', date: '', recurring: false });
      }
    } catch (err: any) {
      showError('Erro ao guardar lembrete');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <input
        name="title"
        placeholder="Título"
        value={form.title}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.title}
        aria-describedby={validationErrors.title ? 'title-error' : undefined}
      />
      {validationErrors.title && <div id="title-error" className="text-red-600 text-sm">{validationErrors.title}</div>}
      <textarea
        name="description"
        placeholder="Descrição"
        value={form.description}
        onChange={handleChange}
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.description}
        aria-describedby={validationErrors.description ? 'description-error' : undefined}
        rows={3}
      />
      {validationErrors.description && <div id="description-error" className="text-red-600 text-sm">{validationErrors.description}</div>}
      <input
        name="date"
        type="date"
        placeholder="Data"
        value={form.date}
        onChange={handleChange}
        required
        className="w-full border rounded p-2"
        aria-invalid={!!validationErrors.date}
        aria-describedby={validationErrors.date ? 'date-error' : undefined}
      />
      {validationErrors.date && <div id="date-error" className="text-red-600 text-sm">{validationErrors.date}</div>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="recurring"
          checked={form.recurring}
          onChange={handleChange}
        />
        Recorrente
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