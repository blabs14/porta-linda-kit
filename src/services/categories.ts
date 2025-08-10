import { supabase } from '../lib/supabaseClient';
import { Category, CategoryInsert, CategoryUpdate } from '../integrations/supabase/types';
import { CategoryDomain, mapCategoryRowToDomain } from '../shared/types/categories';

export const getCategories = async (userId?: string, tipo?: string): Promise<{ data: Category[] | null; error: unknown }> => {
  try {
    let query = supabase
      .from('categories')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (tipo) {
      // A coluna 'tipo' pode existir em esquemas anteriores; aplicamos cast controlado para manter compatibilidade
      query = (query as unknown as { eq: (column: string, value: string) => typeof query }).eq('tipo', tipo);
    }

    const { data, error } = await query.order('nome');

    return { data: data as Category[] | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getCategoriesDomain = async (userId?: string, tipo?: string): Promise<{ data: CategoryDomain[]; error: unknown }> => {
  const { data, error } = await getCategories(userId, tipo);
  return { data: (data || []).map(row => mapCategoryRowToDomain(row as unknown as Record<string, unknown>)), error };
};

export const getCategory = async (id: string): Promise<{ data: Category | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Category | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createCategory = async (categoryData: CategoryInsert): Promise<{ data: Category | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    return { data: data as Category | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCategory = async (id: string, updates: CategoryUpdate): Promise<{ data: Category | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Category | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCategory = async (id: string): Promise<{ data: boolean | null; error: unknown }> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Função para garantir que existe uma categoria de transferências
export const ensureTransferCategory = async (userId: string): Promise<{ data: Category | null; error: unknown }> => {
  try {
    // Verificar se já existe uma categoria de transferências
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .or(`nome.ilike.%transferência%,nome.ilike.%transfer%`)
      .eq('user_id', userId)
      .limit(1);

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Se já existe, retornar a primeira encontrada
    if (existingCategories && existingCategories.length > 0) {
      return { data: existingCategories[0] as Category, error: null };
    }

    // Se não existe, criar uma nova categoria de transferências
    const transferCategory: CategoryInsert = {
      nome: 'Transferências',
      cor: '#3B82F6', // Azul
      user_id: userId,
    };

    const { data: newCategory, error: createError } = await createCategory(transferCategory);
    return { data: newCategory, error: createError };
  } catch (error) {
    return { data: null, error };
  }
};