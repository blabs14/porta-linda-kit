import { supabase } from '../lib/supabaseClient';

export const getSpendingByCategory = async (mes?: string) => {
  // Exemplo: chamada a uma função RPC definida no Supabase
  // Ajusta o nome e parâmetros conforme o teu projeto antigo
  let query = supabase.rpc('spending_by_category', mes ? { mes } : {});
  const { data, error } = await query;
  return { data, error };
};