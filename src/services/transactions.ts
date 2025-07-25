import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getTransactions = async () => {
  const res = await supabase
    .from('transactions')
    .select('*')
    .order('data', { ascending: false });
  console.log('[DEBUG] getTransactions result:', res);
  return res;
};

export const createTransaction = async (data: { account_id: string; valor: number; categoria_id: string; data: string; descricao?: string; }, userId: string) => {
  const res = await supabase.from('transactions').insert(data).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'transactions', 'CREATE', res.data.id, {}, data);
  }
  return res;
};

export const updateTransaction = async (id: string, data: { account_id?: string; valor?: number; categoria_id?: string; data?: string; descricao?: string; }, userId: string) => {
  const oldRes = await supabase.from('transactions').select('*').eq('id', id).single();
  const res = await supabase.from('transactions').update(data).eq('id', id);
  await logAuditChange(userId, 'transactions', 'UPDATE', id, oldRes.data || {}, data);
  return res;
};

export const deleteTransaction = async (id: string, userId: string) => {
  const oldRes = await supabase.from('transactions').select('*').eq('id', id).single();
  const res = await supabase.from('transactions').delete().eq('id', id);
  await logAuditChange(userId, 'transactions', 'DELETE', id, oldRes.data || {}, {});
  return res;
};