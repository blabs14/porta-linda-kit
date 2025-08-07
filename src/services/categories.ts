import { supabase } from '../lib/supabaseClient';
import { Category, CategoryInsert, CategoryUpdate } from '../integrations/supabase/types';

export const getCategories = async (userId?: string, tipo?: string): Promise<{ data: Category[] | null; error: any }> => {
  try {
    let query = supabase
      .from('categories')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query.order('nome');

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getCategory = async (id: string): Promise<{ data: Category | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createCategory = async (categoryData: CategoryInsert): Promise<{ data: Category | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCategory = async (id: string, updates: CategoryUpdate): Promise<{ data: Category | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCategory = async (id: string): Promise<{ data: boolean | null; error: any }> => {
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
export const ensureTransferCategory = async (userId: string): Promise<{ data: Category | null; error: any }> => {
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
      return { data: existingCategories[0], error: null };
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