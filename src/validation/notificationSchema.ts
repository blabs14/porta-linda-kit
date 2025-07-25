import { z } from 'zod';

export const notificationSchema = z.object({
  titulo: z.string().trim().min(2, 'Título obrigatório'),
  mensagem: z.string().trim().min(2, 'Mensagem obrigatória'),
  tipo: z.enum(['info', 'sucesso', 'erro', 'aviso'], { message: 'Tipo inválido' }),
  evento: z.enum(['transacao', 'meta', 'despesa_fixa', 'outro'], { message: 'Evento inválido' }),
}); 