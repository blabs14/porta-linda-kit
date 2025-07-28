import { supabase } from '../lib/supabaseClient';
import { 
  Category, 
  CategoryInsert, 
  CategoryUpdate 
} from '../integrations/supabase/types';

export const getCategories = async (): Promise<{ data: Category[] | null; error: any }> => {
  try {
    console.log('[getCategories] Fetching categories...');
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('nome');

    console.log('[getCategories] Supabase response - data:', data);
    console.log('[getCategories] Supabase response - error:', error);

    return { data, error };
  } catch (error) {
    console.error('[getCategories] Exception:', error);
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

export const createCategory = async (categoryData: CategoryInsert, userId: string): Promise<{ data: Category | null; error: any }> => {
  try {
    console.log('[createCategory] categoryData:', categoryData);
    console.log('[createCategory] userId:', userId);
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...categoryData, user_id: userId }])
      .select()
      .single();

    console.log('[createCategory] Supabase response - data:', data);
    console.log('[createCategory] Supabase response - error:', error);

    return { data, error };
  } catch (error) {
    console.error('[createCategory] Exception:', error);
    return { data: null, error };
  }
};

export const updateCategory = async (id: string, updates: CategoryUpdate, userId: string): Promise<{ data: Category | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCategory = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};