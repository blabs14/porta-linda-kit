import { supabase } from '../lib/supabaseClient';

// Relatório: Total de despesas por categoria (com nome da categoria e filtro opcional por mês)
export const getExpensesByCategory = async (user_id: string, mes?: string): Promise<{ data: any[] | null; error: any }> => {
  try {
    let query = supabase
      .from('transactions')
      .select('valor, categoria_id, categorias:categoria_id(nome)')
      .eq('user_id', user_id);

    // Se o mês for fornecido, filtra as transações desse mês (YYYY-MM)
    if (mes) {
      // Considera que o campo 'data' está em formato ISO (YYYY-MM-DD)
      query = query.gte('data', `${mes}-01`).lt('data', `${mes}-31`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };

    // Agregar por categoria
    const agregados: { [categoria: string]: number } = {};
    data.forEach((t: any) => {
      const nome = t.categorias?.nome || 'Sem categoria';
      agregados[nome] = (agregados[nome] || 0) + (t.valor || 0);
    });

    const resultado = Object.entries(agregados).map(([categoria, total]) => ({ categoria, total }));
    return { data: resultado, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Relatório: Total de receitas por mês
export const getIncomeByMonth = async (user_id: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('data, valor, tipo')
      .eq('user_id', user_id)
      .eq('tipo', 'receita');
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Podes adicionar mais funções de agregação conforme necessário