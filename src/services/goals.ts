import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getGoals = () =>
  supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

export const createGoal = async (data: { nome: string; descricao: string; valor_objetivo: number; valor_atual: number; prazo: string; status?: string; ativa?: boolean; account_id?: string; family_id?: string; }, userId: string) => {
  const res = await supabase.from('goals').insert(data).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'goals', 'CREATE', res.data.id, {}, data);
  }
  return res;
};

export const updateGoal = async (id: string, data: { nome?: string; descricao?: string; valor_objetivo?: number; valor_atual?: number; prazo?: string; status?: string; ativa?: boolean; account_id?: string; family_id?: string; }, userId: string) => {
  const res = await supabase.from('goals').update(data).eq('id', id);
  await logAuditChange(userId, 'goals', 'UPDATE', id, {}, data);
  return res;
};

export const deleteGoal = async (id: string, userId: string) => {
  const res = await supabase.from('goals').delete().eq('id', id);
  await logAuditChange(userId, 'goals', 'DELETE', id, {}, {});
  return res;
};