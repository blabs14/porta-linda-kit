import { z } from 'zod';

export const fixedExpenseSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  valor: z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number({ invalid_type_error: 'Valor inválido' }).min(0.01, 'Valor obrigatório')
  ),
  dia_vencimento: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number({ invalid_type_error: 'Dia inválido' }).int().min(1, 'Dia mínimo: 1').max(31, 'Dia máximo: 31')
  ),
  categoria_id: z.string().trim().min(1, 'Categoria obrigatória'),
  ativa: z.boolean().optional(),
}); 