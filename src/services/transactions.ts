import { supabase } from '../lib/supabaseClient';

export const getTransactions = () =>
  supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

export const createTransaction = (data: {
  conta_id: string;
  valor: number;
  categoria: string;
  data: string;
  descricao?: string;
}) => supabase.from('transactions').insert(data);

export const updateTransaction = (id: string, data: {
  conta_id?: string;
  valor?: number;
  categoria?: string;
  data?: string;
  descricao?: string;
}) => supabase.from('transactions').update(data).eq('id', id);

export const deleteTransaction = (id: string) =>
  supabase.from('transactions').delete().eq('id', id);