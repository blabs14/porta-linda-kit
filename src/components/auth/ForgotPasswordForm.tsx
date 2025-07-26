
import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { showSuccess, showError } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';

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
      showError('Erro ao enviar email: ' + error.message);
      emailRef.current?.focus();
    } else {
      showSuccess('Email de recuperação enviado!');
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleReset} className="space-y-4">
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
          <p className="text-xs text-muted-foreground">O email associado à sua conta.</p>
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
          {loading ? 'A enviar...' : 'Recuperar'}
        </Button>
      </form>
    </div>
  );
}
