import { z } from 'zod';

export const webhookSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  endpoint: z.string().url('Endpoint inválido'),
  evento: z.enum(['transacao', 'meta', 'despesa_fixa', 'outro'], { message: 'Evento inválido' }),
  ativo: z.boolean().optional(),
}); 