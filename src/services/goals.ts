import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getGoals = () =>
  supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

export const createGoal = async (data: { 
  nome: string; 
  valor_objetivo: number; 
  valor_atual: number; 
  prazo: string; 
  status?: string; 
  ativa?: boolean; 
  account_id?: string; 
  family_id?: string; 
}, userId: string) => {
  // Incluir user_id no payload para satisfazer as políticas RLS
  const payload = {
    ...data,
    user_id: userId,
  };
  
  const res = await supabase.from('goals').insert(payload).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'goals', 'CREATE', res.data.id, {}, payload);
  }
  return res;
};

export const updateGoal = async (id: string, data: { 
  nome?: string; 
  valor_objetivo?: number; 
  valor_atual?: number; 
  prazo?: string; 
  status?: string; 
  ativa?: boolean; 
  account_id?: string; 
  family_id?: string; 
}, userId: string) => {
  const oldRes = await supabase.from('goals').select('*').eq('id', id).single();
  const payload = {
    ...data,
    user_id: userId,
  };
  const res = await supabase.from('goals').update(payload).eq('id', id);
  await logAuditChange(userId, 'goals', 'UPDATE', id, oldRes.data || {}, payload);
  return res;
};

export const deleteGoal = async (id: string, userId: string) => {
  const res = await supabase.from('goals').delete().eq('id', id);
  await logAuditChange(userId, 'goals', 'DELETE', id, {}, {});
  return res;
};