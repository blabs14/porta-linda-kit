import { z } from 'zod';

export const accountSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  tipo: z.enum(['corrente', 'poupança', 'investimento', 'outro', 'cartão de crédito'], { message: 'Tipo inválido' }),
  saldoAtual: z.number().optional(),
  ajusteSaldo: z.number().optional(),
});

export type AccountSchema = z.infer<typeof accountSchema>; 