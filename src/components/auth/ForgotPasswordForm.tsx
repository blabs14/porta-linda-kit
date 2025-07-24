import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else setSuccess('Email de recuperação enviado!');
    setLoading(false);
  };

  return (
    <form onSubmit={handleReset} style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Recuperar Password</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
      <button type="submit" disabled={loading} style={{ width: '100%' }}>Recuperar</button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
    </form>
  );
} 