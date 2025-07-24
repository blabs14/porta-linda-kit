import { supabase } from '../lib/supabaseClient';

export const getAccounts = () =>
  supabase.from('accounts').select('*').order('created_at', { ascending: false });

export const createAccount = (data: {
  nome: string;
  tipo: string;
  saldo_inicial: number;
}) => supabase.from('accounts').insert(data);

export const updateAccount = (id: string, data: {
  nome?: string;
  tipo?: string;
  saldo_inicial?: number;
}) => supabase.from('accounts').update(data).eq('id', id);