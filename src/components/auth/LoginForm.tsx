import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithApple, signInWithFacebook } from '../../services/authProviders';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await login(email, password) || {};
    if (error) {
      setError(error.message);
      emailRef.current?.focus();
    } else navigate('/accounts');
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setError('');
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'apple') await signInWithApple();
      if (provider === 'facebook') await signInWithFacebook();
    } catch (err: any) {
      setError('Erro ao autenticar com ' + provider);
    }
  };

  if (user) {
    navigate('/accounts');
    return null;
  }

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Iniciar Sessão</h2>
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
      <button type="submit" disabled={loading} style={{ width: '100%', marginBottom: 8 }}>{loading ? 'A entrar...' : 'Entrar'}</button>
      <div style={{ textAlign: 'center', margin: '16px 0', color: '#888' }}>ou</div>
      <button type="button" onClick={() => handleOAuth('google')} disabled={loading} style={{ width: '100%', marginBottom: 8, background: '#fff', border: '1px solid #ccc', color: '#222', padding: 8, borderRadius: 4 }}>Entrar com Google</button>
      <button type="button" onClick={() => handleOAuth('apple')} disabled={loading} style={{ width: '100%', marginBottom: 8, background: '#000', color: '#fff', padding: 8, borderRadius: 4 }}>Entrar com Apple</button>
      <button type="button" onClick={() => handleOAuth('facebook')} disabled={loading} style={{ width: '100%', marginBottom: 8, background: '#1877f3', color: '#fff', padding: 8, borderRadius: 4 }}>Entrar com Facebook</button>
    </form>
  );
} 