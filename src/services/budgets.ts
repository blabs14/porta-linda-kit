import { supabase } from '../lib/supabaseClient';
import { 
  Budget, 
  BudgetInsert, 
  BudgetUpdate 
} from '../integrations/supabase/types';

export const getBudgets = async (): Promise<{ data: Budget[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('mes', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBudget = async (id: string): Promise<{ data: Budget | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createBudget = async (budgetData: BudgetInsert, userId: string): Promise<{ data: Budget | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .insert([{ ...budgetData, user_id: userId }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBudget = async (id: string, updates: BudgetUpdate, userId: string): Promise<{ data: Budget | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('budgets')
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

export const deleteBudget = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getPersonalBudgets = async (): Promise<{ data: Budget[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_personal_budgets');

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getFamilyBudgets = async (): Promise<{ data: Budget[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_family_budgets');

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};