import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { showSuccess } from '../../lib/utils';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      emailRef.current?.focus();
    } else showSuccess('Registo efetuado! Verifica o teu email para confirmar a conta.');
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Criar Conta</h2>
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
        <small>O teu email de acesso.</small>
        {error && (
          <span id="email-error" style={{ color: 'red', display: 'block' }} aria-live="polite">{error}</span>
        )}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          aria-invalid={!!error}
          style={{ width: '100%', marginBottom: 4, outline: '2px solid #1976d2' }}
        />
        <small>Deve ter pelo menos 6 caracteres.</small>
      </div>
      <button type="submit" disabled={loading} style={{ width: '100%' }}>Registar</button>
    </form>
  );
} 