import { z } from 'zod';

export const accountSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  tipo: z.enum(['corrente', 'poupança', 'investimento', 'outro'], { message: 'Tipo inválido' }),
});

export type AccountSchema = z.infer<typeof accountSchema>; 