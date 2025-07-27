import { z } from 'zod';

export const goalSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  valor_objetivo: z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number({ invalid_type_error: 'Valor objetivo inválido' }).min(0.01, 'Valor objetivo obrigatório')
  ),
  valor_atual: z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number({ invalid_type_error: 'Valor atual inválido' }).min(0, 'Valor atual obrigatório')
  ),
  prazo: z.string().min(1, 'Prazo obrigatório'),
  status: z.string().optional(),
  ativa: z.boolean().optional(),
  account_id: z.string().optional(),
  family_id: z.string().optional(),
}); 