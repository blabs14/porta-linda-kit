import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getBudgets = () =>
  supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false });

export const createBudget = async (data: { categoria_id: string; valor: number; mes: string; }, userId: string) => {
  const res = await supabase.from('budgets').insert(data).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'budgets', 'CREATE', res.data.id, {}, data);
  }
  return res;
};

export const updateBudget = async (id: string, data: { categoria_id?: string; valor?: number; mes?: string; }, userId: string) => {
  const oldRes = await supabase.from('budgets').select('*').eq('id', id).single();
  const res = await supabase.from('budgets').update(data).eq('id', id);
  await logAuditChange(userId, 'budgets', 'UPDATE', id, oldRes.data || {}, data);
  return res;
};

export const deleteBudget = async (id: string, userId: string) => {
  const oldRes = await supabase.from('budgets').select('*').eq('id', id).single();
  const res = await supabase.from('budgets').delete().eq('id', id);
  await logAuditChange(userId, 'budgets', 'DELETE', id, oldRes.data || {}, {});
  return res;
};