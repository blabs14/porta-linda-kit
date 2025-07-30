import { z } from 'zod';

export const accountSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  tipo: z.enum(['corrente', 'poupança', 'investimento', 'outro', 'cartão de crédito'], { message: 'Tipo inválido' }),
  saldo: z.number().min(0, 'Saldo deve ser maior ou igual a 0').optional().default(0),
});

export type AccountSchema = z.infer<typeof accountSchema>; 