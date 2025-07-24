import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signupSchema, SignupFormData } from '../models/authSchema';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Register = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupFormData>({ email: '', password: '', nome: '' });
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDetails([]);
    try {
      signupSchema.parse(form);
      setLoading(true);
      const { error } = await signup(form);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-center mb-2">Criar Conta</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {details.length > 0 && (
            <ul className="text-red-500 text-xs list-disc ml-4">
              {details.map((d, i) => <li key={i}>{d.message || d}</li>)}
            </ul>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">{loading ? 'A criar...' : 'Criar Conta'}</Button>
        </form>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm mt-2">
          <Link to="/login" className="text-blue-600 hover:underline">Já tenho conta</Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 