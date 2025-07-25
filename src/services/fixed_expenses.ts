import { supabase } from '../lib/supabaseClient';

export const getFixedExpenses = () =>
  supabase
    .from('fixed_expenses')
    .select('*')
    .order('dia_vencimento', { ascending: true });

export const createFixedExpense = (data: {
  nome: string;
  valor: number;
  dia_vencimento: number;
  categoria_id?: string;
  ativa?: boolean;
  user_id?: string;
  family_id?: string;
}) => supabase.from('fixed_expenses').insert(data);

export const updateFixedExpense = (id: string, data: {
  nome?: string;
  valor?: number;
  dia_vencimento?: number;
  categoria_id?: string;
  ativa?: boolean;
  user_id?: string;
  family_id?: string;
}) => supabase.from('fixed_expenses').update(data).eq('id', id);

export const deleteFixedExpense = (id: string) =>
  supabase.from('fixed_expenses').delete().eq('id', id); 