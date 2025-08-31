
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithApple, signInWithFacebook } from '../../services/authProviders';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { showError } from '../../lib/utils';

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
      showError('Erro ao iniciar sessão: ' + error.message);
      emailRef.current?.focus();
    } else {
      navigate('/app');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setError('');
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'apple') await signInWithApple();
      if (provider === 'facebook') await signInWithFacebook();
    } catch (err: any) {
      const errorMessage = 'Erro ao autenticar com ' + provider;
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              ref={emailRef}
              autoFocus
              className="pl-10"
              aria-invalid={!!error}
            />
          </div>
          <p className="text-xs text-muted-foreground">O seu email de acesso.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="pl-10"
              aria-invalid={!!error}
            />
          </div>
          <p className="text-xs text-muted-foreground">Deve ter pelo menos 6 caracteres.</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full"
          variant="default"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'A entrar...' : 'Entrar'}
        </Button>
      </form>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            type="button" 
            onClick={() => handleOAuth('google')} 
            disabled={loading} 
            variant="outline"
            className="w-full"
          >
            <div className="w-4 h-4 mr-2 bg-[#4285f4] rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            Entrar com Google
          </Button>

          <Button 
            type="button" 
            onClick={() => handleOAuth('apple')} 
            disabled={loading} 
            variant="outline"
            className="w-full"
          >
            <div className="w-4 h-4 mr-2 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs">🍎</span>
            </div>
            Entrar com Apple
          </Button>

          <Button 
            type="button" 
            onClick={() => handleOAuth('facebook')} 
            disabled={loading} 
            variant="outline"
            className="w-full"
          >
            <div className="w-4 h-4 mr-2 bg-[#1877f2] rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">f</span>
            </div>
            Entrar com Facebook
          </Button>
        </div>
      </div>
    </div>
  );
}
