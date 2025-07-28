import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export interface GoalAllocation {
  id: string;
  goal_id: string;
  account_id: string;
  valor: number;
  data_alocacao: string;
  descricao?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateGoalAllocationData {
  goal_id: string;
  account_id: string;
  valor: number;
  data_alocacao?: string;
  descricao?: string;
}

export interface UpdateGoalAllocationData {
  valor?: number;
  data_alocacao?: string;
  descricao?: string;
}

// Listar alocações de um objetivo
export const getGoalAllocations = async (goalId: string, userId: string) => {
  const { data, error } = await supabase
    .from('goal_allocations')
    .select('*')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('data_alocacao', { ascending: false });

  if (error) {
    console.error('Erro ao buscar alocações:', error);
    throw error;
  }

  return data || [];
};

// Listar todas as alocações do utilizador
export const getAllGoalAllocations = async (userId: string) => {
  const { data, error } = await supabase
    .from('goal_allocations')
    .select('*')
    .eq('user_id', userId)
    .order('data_alocacao', { ascending: false });

  if (error) {
    console.error('Erro ao buscar alocações:', error);
    throw error;
  }

  return data || [];
};

// Criar nova alocação
export const createGoalAllocation = async (data: CreateGoalAllocationData, userId: string) => {
  const payload = {
    ...data,
    user_id: userId,
    data_alocacao: data.data_alocacao || new Date().toISOString().split('T')[0]
  };

  const { data: allocation, error } = await supabase
    .from('goal_allocations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao criar alocação:', error);
    throw error;
  }

  // Log da auditoria
  if (allocation?.id) {
    await logAuditChange(userId, 'goal_allocations', 'CREATE', allocation.id, {}, payload);
  }

  return allocation;
};

// Atualizar alocação
export const updateGoalAllocation = async (id: string, data: UpdateGoalAllocationData, userId: string) => {
  const oldRes = await supabase.from('goal_allocations').select('*').eq('id', id).single();
  
  const payload = {
    ...data,
    user_id: userId
  };

  const { data: allocation, error } = await supabase
    .from('goal_allocations')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao atualizar alocação:', error);
    throw error;
  }

  // Log da auditoria
  await logAuditChange(userId, 'goal_allocations', 'UPDATE', id, oldRes.data || {}, payload);

  return allocation;
};

// Eliminar alocação
export const deleteGoalAllocation = async (id: string, userId: string) => {
  const oldRes = await supabase.from('goal_allocations').select('*').eq('id', id).single();
  
  const { error } = await supabase
    .from('goal_allocations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao eliminar alocação:', error);
    throw error;
  }

  // Log da auditoria
  await logAuditChange(userId, 'goal_allocations', 'DELETE', id, oldRes.data || {}, {});

  return { success: true };
};

// Calcular total de alocações para um objetivo
export const getGoalAllocationsTotal = async (goalId: string, userId: string) => {
  const { data, error } = await supabase
    .from('goal_allocations')
    .select('valor')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao calcular total de alocações:', error);
    throw error;
  }

  return data?.reduce((total, allocation) => total + Number(allocation.valor), 0) || 0;
};

// Calcular total de alocações por conta
export const getAccountAllocationsTotal = async (accountId: string, userId: string) => {
  const { data, error } = await supabase
    .from('goal_allocations')
    .select('valor')
    .eq('account_id', accountId)
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao calcular total de alocações da conta:', error);
    throw error;
  }

  return data?.reduce((total, allocation) => total + Number(allocation.valor), 0) || 0;
}; 