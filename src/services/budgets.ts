import { supabase } from '../lib/supabaseClient';

export const getBudgets = () =>
  supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false });

export const createBudget = (data: {
  categoria: string;
  valor: number;
  mes: string; // formato YYYY-MM
}) => supabase.from('budgets').insert(data);

export const updateBudget = (id: string, data: {
  categoria?: string;
  valor?: number;
  mes?: string;
}) => supabase.from('budgets').update(data).eq('id', id);

export const deleteBudget = (id: string) =>
  supabase.from('budgets').delete().eq('id', id);