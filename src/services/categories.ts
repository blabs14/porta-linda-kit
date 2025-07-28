import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export const getCategories = () =>
  supabase
    .from('categories')
    .select('*')
    .order('nome', { ascending: true });

export const createCategory = async (data: { nome: string; cor?: string; descricao?: string }, userId: string) => {
  console.log('🔍 Tentando criar categoria:', { data, userId });
  
  if (!userId) {
    throw new Error('Utilizador não autenticado');
  }

  // Incluir user_id no payload para satisfazer as políticas RLS
  const payload = {
    ...data,
    user_id: userId,
  };
  
  console.log('📦 Payload para criação:', payload);
  
  const res = await supabase.from('categories').insert(payload).select('id').single();
  
  if (res.error) {
    console.error('❌ Erro ao criar categoria:', res.error);
    throw res.error;
  }
  
  console.log('✅ Categoria criada com sucesso:', res.data);
  
  if (res.data?.id) {
    try {
      await logAuditChange(userId, 'categories', 'CREATE', res.data.id, {}, payload);
    } catch (auditError) {
      console.warn('⚠️ Erro no log de auditoria (não crítico):', auditError);
    }
  }
  
  return res;
};

export const updateCategory = async (id: string, data: { nome?: string; cor?: string; descricao?: string }, userId: string) => {
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