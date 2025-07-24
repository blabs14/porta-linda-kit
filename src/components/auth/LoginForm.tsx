import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await login(email, password) || {};
    if (error) setError(error.message);
    else navigate('/accounts');
  };

  // Se já está autenticado, redireciona
  if (user) {
    navigate('/accounts');
    return null;
  }

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Iniciar Sessão</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
      <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'A entrar...' : 'Entrar'}</button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </form>
  );
} 