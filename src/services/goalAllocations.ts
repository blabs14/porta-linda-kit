import { supabase } from '../lib/supabaseClient';
import { 
  GoalAllocation, 
  GoalAllocationInsert, 
  GoalAllocationUpdate 
} from '../integrations/supabase/types';

export const getGoalAllocations = async (goalId: string): Promise<{ data: GoalAllocation[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('*')
      .eq('goal_id', goalId)
      .order('data_alocacao', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAllGoalAllocations = async (): Promise<{ data: GoalAllocation[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('*')
      .order('data_alocacao', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createGoalAllocation = async (allocationData: GoalAllocationInsert, userId: string): Promise<{ data: GoalAllocation | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .insert([{ ...allocationData, user_id: userId }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateGoalAllocation = async (id: string, updates: GoalAllocationUpdate, userId: string): Promise<{ data: GoalAllocation | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
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

export const deleteGoalAllocation = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('goal_allocations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getGoalAllocationsTotal = async (goalId: string, userId: string): Promise<{ data: number | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('valor')
      .eq('goal_id', goalId)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error };
    }

    const total = data?.reduce((sum, allocation) => sum + (allocation.valor || 0), 0) || 0;
    return { data: total, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAccountAllocationsTotal = async (accountId: string, userId: string): Promise<{ data: number | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('valor')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error };
    }

    const total = data?.reduce((sum, allocation) => sum + (allocation.valor || 0), 0) || 0;
    return { data: total, error: null };
  } catch (error) {
    return { data: null, error };
  }
}; 