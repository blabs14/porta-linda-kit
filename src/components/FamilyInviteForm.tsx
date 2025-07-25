import { useState, useRef } from 'react';
import { familyInviteSchema } from '../validation/familyInviteSchema';
import { createFamilyInvite, updateFamilyInvite } from '../services/family_invites';
import { showError } from '../lib/utils';

interface FamilyInviteFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FamilyInviteForm({ initialData, onSuccess, onCancel }: FamilyInviteFormProps) {
  const [form, setForm] = useState({
    id: initialData?.id || '',
    family_id: initialData?.family_id || '',
    email: initialData?.email || '',
    role: initialData?.role || '',
    status: initialData?.status || '',
    invited_by: initialData?.invited_by || '',
    expires_at: initialData?.expires_at || '',
    token: initialData?.token || '',
    accepted_at: initialData?.accepted_at || '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);
    const result = familyInviteSchema.safeParse({
      family_id: form.family_id,
      email: form.email,
      role: form.role,
      status: form.status,
      invited_by: form.invited_by,
      expires_at: form.expires_at,
      token: form.token,
      accepted_at: form.accepted_at,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      setLoading(false);
      if (fieldErrors.email) emailRef.current?.focus();
      return;
    }
    try {
      const payload = {
        family_id: form.family_id,
        email: form.email,
        role: form.role,
        status: form.status,
        invited_by: form.invited_by,
        expires_at: form.expires_at,
        token: form.token,
        accepted_at: form.accepted_at,
      };
      let res;
      if (form.id) {
        res = await updateFamilyInvite(form.id, payload);
      } else {
        res = await createFamilyInvite(payload);
      }
      setLoading(false);
      if (res.error) {
        showError(res.error.message);
      } else {
        if (onSuccess) onSuccess();
        if (!form.id) setForm({ id: '', family_id: '', email: '', role: '', status: '', invited_by: '', expires_at: '', token: '', accepted_at: '' });
      }
    } catch (err: any) {
      showError('Erro ao guardar convite');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <div>
        <label htmlFor="family_id">ID da Família</label>
        <input
          id="family_id"
          name="family_id"
          placeholder="ID da Família"
          value={form.family_id}
          onChange={handleChange}
          required
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.family_id}
          aria-describedby={validationErrors.family_id ? 'family-id-error' : undefined}
        />
        {validationErrors.family_id && <div id="family-id-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.family_id}</div>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          placeholder="Email do convidado"
          value={form.email}
          onChange={handleChange}
          required
          ref={emailRef}
          autoFocus
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.email}
          aria-describedby={validationErrors.email ? 'email-error' : undefined}
        />
        <small>O email para onde será enviado o convite.</small>
        {validationErrors.email && <div id="email-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.email}</div>}
      </div>
      <div>
        <label htmlFor="role">Função</label>
        <input
          id="role"
          name="role"
          placeholder="Função (ex: member, admin)"
          value={form.role}
          onChange={handleChange}
          required
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.role}
          aria-describedby={validationErrors.role ? 'role-error' : undefined}
        />
        <small>Função a atribuir ao convidado.</small>
        {validationErrors.role && <div id="role-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.role}</div>}
      </div>
      <div>
        <label htmlFor="status">Estado</label>
        <input
          id="status"
          name="status"
          placeholder="Estado do convite"
          value={form.status}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.status}
          aria-describedby={validationErrors.status ? 'status-error' : undefined}
        />
        {validationErrors.status && <div id="status-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.status}</div>}
      </div>
      <div>
        <label htmlFor="invited_by">Convidado por (user_id)</label>
        <input
          id="invited_by"
          name="invited_by"
          placeholder="ID do utilizador que convidou"
          value={form.invited_by}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.invited_by}
          aria-describedby={validationErrors.invited_by ? 'invited-by-error' : undefined}
        />
        {validationErrors.invited_by && <div id="invited-by-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.invited_by}</div>}
      </div>
      <div>
        <label htmlFor="expires_at">Expira em</label>
        <input
          id="expires_at"
          name="expires_at"
          type="datetime-local"
          placeholder="Expira em"
          value={form.expires_at}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.expires_at}
          aria-describedby={validationErrors.expires_at ? 'expires-at-error' : undefined}
        />
        {validationErrors.expires_at && <div id="expires-at-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.expires_at}</div>}
      </div>
      <div>
        <label htmlFor="token">Token</label>
        <input
          id="token"
          name="token"
          placeholder="Token do convite"
          value={form.token}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.token}
          aria-describedby={validationErrors.token ? 'token-error' : undefined}
        />
        {validationErrors.token && <div id="token-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.token}</div>}
      </div>
      <div>
        <label htmlFor="accepted_at">Aceite em</label>
        <input
          id="accepted_at"
          name="accepted_at"
          type="datetime-local"
          placeholder="Aceite em"
          value={form.accepted_at}
          onChange={handleChange}
          className="w-full border rounded p-2"
          aria-invalid={!!validationErrors.accepted_at}
          aria-describedby={validationErrors.accepted_at ? 'accepted-at-error' : undefined}
        />
        {validationErrors.accepted_at && <div id="accepted-at-error" className="text-red-600 text-sm" aria-live="polite">{validationErrors.accepted_at}</div>}
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