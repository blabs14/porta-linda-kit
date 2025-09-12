import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [log, setLog] = useState('');

  const handleSignup = async () => {
    const res = await supabase.auth.signUp({ email, password });
    setLog(JSON.stringify(res, null, 2));
  };

  const handleLogin = async () => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    setLog(JSON.stringify(res, null, 2));
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Teste Supabase Auth</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 8 }} aria-label="Endereço de email" />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 8 }} aria-label="Palavra-passe" />
      <button onClick={handleSignup} style={{ width: '100%', marginBottom: 8 }} aria-label="Registar nova conta">Registar</button>
      <button onClick={handleLogin} style={{ width: '100%' }} aria-label="Iniciar sessão">Login</button>
      <pre style={{ marginTop: 16, background: '#eee', padding: 8 }}>{log}</pre>
    </div>
  );
}