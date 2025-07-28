import { z } from 'zod';

export const categorySchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hexadecimal válido'),
  descricao: z.string().optional(),
}); 