import { supabase } from '../lib/supabaseClient';

// Relatório: Total de despesas por categoria
export const getExpensesByCategory = async (user_id: string) => {
  return supabase
    .from('transactions')
    .select('categoria_id, valor')
    .eq('user_id', user_id);
};

// Relatório: Total de receitas por mês
export const getIncomeByMonth = async (user_id: string) => {
  return supabase
    .from('transactions')
    .select('data, valor, tipo')
    .eq('user_id', user_id)
    .eq('tipo', 'receita');
};

// Podes adicionar mais funções de agregação conforme necessário