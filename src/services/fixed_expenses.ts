import { supabase } from '../lib/supabaseClient';

export const getFixedExpenses = async () => {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .order('dia_vencimento', { ascending: true });
  return { data, error };
};

export const createFixedExpense = async (data: {
  nome: string;
  valor: number;
  dia_vencimento: number;
  categoria_id?: string;
  ativa?: boolean;
  user_id?: string;
  family_id?: string;
}) => {
  const { data: result, error } = await supabase.from('fixed_expenses').insert(data);
  return { data: result, error };
};

export const updateFixedExpense = async (id: string, data: {
  nome?: string;
  valor?: number;
  dia_vencimento?: number;
  categoria_id?: string;
  ativa?: boolean;
  user_id?: string;
  family_id?: string;
}) => {
  const { data: result, error } = await supabase.from('fixed_expenses').update(data).eq('id', id);
  return { data: result, error };
};

export const deleteFixedExpense = async (id: string) => {
  const { data, error } = await supabase.from('fixed_expenses').delete().eq('id', id);
  return { data, error };
}; 