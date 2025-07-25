import { z } from 'zod';

export const settingsSchema = z.object({
  moeda: z.enum(['EUR', 'USD', 'BRL', 'GBP', 'AOA', 'MZN', 'CVE', 'XOF', 'XAF'], { message: 'Moeda inválida' }),
  idioma: z.enum(['pt', 'en', 'es', 'fr'], { message: 'Idioma inválido' }),
  tema: z.enum(['claro', 'escuro', 'sistema'], { message: 'Tema inválido' }),
  notificacoes: z.boolean().optional(),
}); 