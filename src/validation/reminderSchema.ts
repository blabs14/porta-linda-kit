import { z } from 'zod';

export const reminderSchema = z.object({
  titulo: z.string().trim().min(2, 'Título obrigatório'),
  descricao: z.string().trim().max(255, 'Descrição demasiado longa').optional().or(z.literal('')),
  data_lembrete: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
  hora_lembrete: z.string().regex(/^\d{2}:\d{2}$/,'Hora inválida (HH:mm)').optional().or(z.literal('')),
  repetir: z.enum(['nenhuma','diario','semanal','mensal','anual'], { message: 'Frequência inválida' }),
  ativo: z.boolean(),
}); 