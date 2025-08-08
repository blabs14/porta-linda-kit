import { supabase } from '../lib/supabaseClient';
import type { Database } from '../integrations/supabase/database.types';

type Json = Database['public']['Tables']['families']['Row']['settings'];

// Exemplo: wrapper para agregação customizada (ex: saldo total)
export const getTotalBalance = async (user_id: string) => {
  // RPC possivelmente retorna Json; deixamos como unknown e convertemos no consumidor
  return supabase.rpc('get_user_financial_summary' as unknown as keyof Database['public']['Functions'], {} as never);
};

// Exemplo: wrapper para relatório customizado
export const getCustomReport = async <TReport = unknown>(params: Record<string, unknown>) => {
  return supabase.rpc('custom_report', params as unknown as { [key: string]: Json });
};

// Adiciona mais funções conforme os wrappers definidos no Supabase 