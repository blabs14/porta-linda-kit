import { z } from 'zod';

export const profileSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.string().trim().email('Email inválido'),
  telefone: z.string().trim().min(9, 'Telefone obrigatório').max(20, 'Telefone demasiado longo').optional(),
  avatar_url: z.string().url('URL de avatar inválida').optional(),
}); 