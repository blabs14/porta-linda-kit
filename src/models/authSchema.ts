import { z } from 'zod';

// Validação de email mais robusta
const emailValidation = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Formato de email inválido')
  .max(254, 'Email demasiado longo')
  .refine(
    (email) => {
      // Verificar se não tem espaços
      return !email.includes(' ');
    },
    { message: 'Email não pode conter espaços' }
  )
  .refine(
    (email) => {
      // Verificar domínio básico
      const domain = email.split('@')[1];
      return domain && domain.includes('.');
    },
    { message: 'Domínio de email inválido' }
  );

// Validação de password mais robusta
const passwordValidation = z
  .string()
  .min(1, 'Password é obrigatória')
  .min(6, 'Password deve ter pelo menos 6 caracteres')
  .max(128, 'Password demasiado longa')
  .refine(
    (password) => {
      // Pelo menos uma letra
      return /[a-zA-Z]/.test(password);
    },
    { message: 'Password deve conter pelo menos uma letra' }
  );

// Validação de nome
const nomeValidation = z
  .string()
  .min(1, 'Nome é obrigatório')
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome demasiado longo')
  .refine(
    (nome) => {
      // Apenas letras, espaços e alguns caracteres especiais
      return /^[a-zA-ZÀ-ÿ\s'-]+$/.test(nome);
    },
    { message: 'Nome contém caracteres inválidos' }
  )
  .transform((nome) => nome.trim());

export const signupSchema = z.object({
  email: emailValidation,
  password: passwordValidation,
  nome: nomeValidation,
});

export const loginSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, 'Password é obrigatória'),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;