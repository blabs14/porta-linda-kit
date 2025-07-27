import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getCategories = () =>
  supabase
    .from('categories')
    .select('*')
    .order('nome', { ascending: true });

export const createCategory = async (data: { nome: string; tipo: string; cor?: string }, userId: string) => {
  // Incluir user_id no payload para satisfazer as políticas RLS
  const payload = {
    ...data,
    user_id: userId,
  };
  
  const res = await supabase.from('categories').insert(payload).select('id').single();
  if (res.data?.id) {
    await logAuditChange(userId, 'categories', 'CREATE', res.data.id, {}, payload);
  }
  return res;
};

export const updateCategory = async (id: string, data: { nome?: string; tipo?: string; cor?: string }, userId: string) => {
  const oldRes = await supabase.from('categories').select('*').eq('id', id).single();
  const res = await supabase.from('categories').update(data).eq('id', id);
  await logAuditChange(userId, 'categories', 'UPDATE', id, oldRes.data || {}, data);
  return res;
};

export const deleteCategory = async (id: string, userId: string) => {
  const oldRes = await supabase.from('categories').select('*').eq('id', id).single();
  const res = await supabase.from('categories').delete().eq('id', id);
  await logAuditChange(userId, 'categories', 'DELETE', id, oldRes.data || {}, {});
  return res;
};