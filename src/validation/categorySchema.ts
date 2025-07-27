import { z } from 'zod';

export const categorySchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
}); 