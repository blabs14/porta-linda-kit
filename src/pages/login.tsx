import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, LoginFormData } from '../models/authSchema';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormData>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDetails([]);
    try {
      loginSchema.parse(form);
      setLoading(true);
      const { error } = await login(form);
      setLoading(false);
      if (error) {
        setError(error.message);
        setDetails(error.details || []);
      } else {
        navigate('/accounts');
      }
    } catch (err: any) {
      setError('Dados inválidos');
      setDetails(err.errors || []);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/login',
    });
    setResetLoading(false);
    if (error) {
      setResetMsg('Erro: ' + error.message);
    } else {
      setResetMsg('Se o email existir, receberá instruções para recuperar a password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-center mb-2">Iniciar Sessão</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required autoFocus />
          <Input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {details.length > 0 && (
            <ul className="text-red-500 text-xs list-disc ml-4">
              {details.map((d, i) => <li key={i}>{d.message || d}</li>)}
            </ul>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">{loading ? 'A entrar...' : 'Entrar'}</Button>
        </form>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm mt-2">
          <Link to="/register" className="text-blue-600 hover:underline">Criar nova conta</Link>
          <button type="button" className="text-blue-600 hover:underline" onClick={() => setResetOpen(true)}>Recuperar password</button>
        </div>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReset} className="flex flex-col gap-4 p-2">
            <Input
              type="email"
              placeholder="O seu email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              required
              autoFocus
            />
            {resetMsg && <div className="text-sm text-blue-700">{resetMsg}</div>}
            <Button type="submit" disabled={resetLoading} className="w-full">{resetLoading ? 'A enviar...' : 'Enviar instruções'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login; 