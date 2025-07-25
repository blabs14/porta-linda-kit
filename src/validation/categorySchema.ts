import { z } from 'zod';

export const categorySchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  tipo: z.enum(['despesa', 'receita', 'poupança', 'investimento', 'outro'], { message: 'Tipo inválido' }),
  cor: z.string().trim().min(4, 'Cor obrigatória').max(7, 'Cor inválida'),
}); 