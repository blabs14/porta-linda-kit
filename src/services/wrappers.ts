import { supabase } from '../lib/supabaseClient';

// Exemplo: wrapper para agregação customizada (ex: saldo total)
// NOTA: As funções RPC 'get_total_balance' e 'custom_report' não existem no schema atual
// export const getTotalBalance = async (user_id: string): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase.rpc('get_total_balance', { user_id });
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// export const getCustomReport = async (params: any): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase.rpc('custom_report', params);
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// Adiciona mais funções conforme os wrappers definidos no Supabase 