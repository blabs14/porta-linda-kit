import { supabase } from '../lib/supabaseClient';

// Exemplo: wrapper para agregação customizada (ex: saldo total)
export const getTotalBalance = async (user_id: string) => {
  return supabase.rpc('get_total_balance', { user_id });
};

// Exemplo: wrapper para relatório customizado
export const getCustomReport = async (params: any) => {
  return supabase.rpc('custom_report', params);
};

// Adiciona mais funções conforme os wrappers definidos no Supabase 