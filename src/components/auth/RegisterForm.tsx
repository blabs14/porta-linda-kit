
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { signupSchema, type SignupFormData } from '../../models/authSchema';

export const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const { register } = useAuth();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur'
  });

  const handleRegister = async (data: SignupFormData) => {
    setSuccess('');
    clearErrors();
    setIsLoading(true);

    try {
      const result = await register(data.email, data.password, data.nome);
      
      if (result?.error) {
        // Mapear erros específicos para campos
        const errorMessage = result.error.message || 'Erro ao criar conta';
        
        if (errorMessage.includes('email')) {
          setError('email', {
            type: 'server',
            message: errorMessage
          });
          if (emailRef.current) {
            emailRef.current.focus();
          }
        } else if (errorMessage.includes('password')) {
          setError('password', {
            type: 'server',
            message: errorMessage
          });
        } else {
          setError('root', {
            type: 'server',
            message: errorMessage
          });
        }
      } else {
        setSuccess('Conta criada com sucesso! Pode fazer login.');
      }
    } catch (err: any) {
      setError('root', {
        type: 'server',
        message: err.message || 'Erro inesperado ao criar conta'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="nome"
            type="text"
            placeholder="Seu nome completo"
            {...registerField('nome')}
            className={`pl-10 ${errors.nome ? 'border-red-500 focus:border-red-500' : ''}`}
          />
        </div>
        {errors.nome && (
          <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={emailRef}
            id="email"
            type="email"
            placeholder="seu@email.com"
            {...registerField('email')}
            className={`pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Sua password"
            {...registerField('password')}
            className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || isSubmitting}
      >
        {isLoading || isSubmitting ? 'Criando conta...' : 'Criar conta'}
      </Button>
    </form>
  );
};

export default RegisterForm;
