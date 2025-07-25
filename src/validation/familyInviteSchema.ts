import { z } from 'zod';

export const familyInviteSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  role: z.enum(['owner', 'admin', 'member', 'viewer'], { message: 'Função inválida' }),
}); 