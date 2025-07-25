import { z } from 'zod';

export const budgetSchema = z.object({
  categoria_id: z.string().trim().min(1, 'Categoria obrigatória'),
  valor: z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number({ invalid_type_error: 'Valor inválido' }).min(0.01, 'Valor obrigatório')
  ),
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Mês inválido (YYYY-MM)').min(1, 'Mês obrigatório'),
}); 