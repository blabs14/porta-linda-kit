import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { showSuccess } from '../../lib/utils';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
      emailRef.current?.focus();
    } else showSuccess('Email de recuperação enviado!');
    setLoading(false);
  };

  return (
    <form onSubmit={handleReset} style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Recuperar Password</h2>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="exemplo@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          ref={emailRef}
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'email-error' : undefined}
          style={{ width: '100%', marginBottom: 4, outline: '2px solid #1976d2' }}
        />
        <small>O email associado à tua conta.</small>
        {error && (
          <span id="email-error" style={{ color: 'red', display: 'block' }} aria-live="polite">{error}</span>
        )}
      </div>
      <button type="submit" disabled={loading} style={{ width: '100%' }}>Recuperar</button>
    </form>
  );
} 