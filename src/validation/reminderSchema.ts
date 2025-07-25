import { z } from 'zod';

export const reminderSchema = z.object({
  titulo: z.string().trim().min(2, 'Título obrigatório'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
  tipo: z.enum(['pagamento', 'evento', 'outro'], { message: 'Tipo inválido' }),
  descricao: z.string().trim().max(255, 'Descrição demasiado longa').optional(),
}); 