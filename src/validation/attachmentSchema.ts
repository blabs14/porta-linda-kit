import { z } from 'zod';

export const attachmentSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  url: z.string().url('URL inválida'),
  tipo: z.string().trim().min(2, 'Tipo obrigatório'),
  tamanho: z.number().min(1, 'Tamanho inválido'),
}); 