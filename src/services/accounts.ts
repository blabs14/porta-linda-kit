import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getAccounts = () =>
  supabase.from('accounts').select('*').order('created_at', { ascending: false });

export const createAccount = async (data: { nome: string; tipo: string; saldo?: number }, userId: string) => {
  // Incluir user_id no payload para satisfazer as políticas RLS
  const payload = {
    ...data,
    user_id: userId,
    saldo: data.saldo || 0,
  };
  
  const res = await supabase.from('accounts').insert(payload).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'accounts', 'CREATE', res.data.id, {}, payload);
  }
  return res;
};

export const updateAccount = async (id: string, data: { nome?: string; tipo?: string; saldo?: number }, userId: string) => {
  const oldRes = await supabase.from('accounts').select('*').eq('id', id).single();
  const res = await supabase.from('accounts').update(data).eq('id', id);
  await logAuditChange(userId, 'accounts', 'UPDATE', id, oldRes.data || {}, data);
  return res;
};

export const deleteAccount = async (id: string, userId: string) => {
  const oldRes = await supabase.from('accounts').select('*').eq('id', id).single();
  const res = await supabase.from('accounts').delete().eq('id', id);
  await logAuditChange(userId, 'accounts', 'DELETE', id, oldRes.data || {}, {});
  return res;
};