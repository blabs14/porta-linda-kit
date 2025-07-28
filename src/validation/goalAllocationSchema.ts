import { z } from 'zod';

export const goalAllocationSchema = z.object({
  goal_id: z.string().uuid('ID do objetivo inválido'),
  account_id: z.string().uuid('ID da conta inválido'),
  valor: z.number().positive('Valor deve ser maior que zero').min(0.01, 'Valor mínimo é 0,01€'),
  data_alocacao: z.string().optional(),
  descricao: z.string().optional(),
});

export const createGoalAllocationSchema = goalAllocationSchema.omit({
  data_alocacao: true,
});

export const updateGoalAllocationSchema = z.object({
  valor: z.number().positive('Valor deve ser maior que zero').min(0.01, 'Valor mínimo é 0,01€').optional(),
  data_alocacao: z.string().optional(),
  descricao: z.string().optional(),
});

export type GoalAllocationFormData = z.infer<typeof goalAllocationSchema>;
export type CreateGoalAllocationData = z.infer<typeof createGoalAllocationSchema>;
export type UpdateGoalAllocationData = z.infer<typeof updateGoalAllocationSchema>; 