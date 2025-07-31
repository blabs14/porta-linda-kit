import { supabase } from '../lib/supabaseClient';
import { 
  Goal, 
  GoalInsert, 
  GoalUpdate,
  GoalProgressRPC
} from '../integrations/supabase/types';

export const getGoals = async (userId: string): Promise<{ data: Goal[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getGoal = async (id: string, userId: string): Promise<{ data: Goal | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createGoal = async (goalData: GoalInsert, userId: string): Promise<{ data: Goal | null; error: any }> => {
  try {
    console.log('[createGoal] goalData:', goalData);
    console.log('[createGoal] userId:', userId);
    
    const { data, error } = await supabase
      .from('goals')
      .insert([{ ...goalData, user_id: userId }])
      .select()
      .single();

    console.log('[createGoal] Supabase response - data:', data);
    console.log('[createGoal] Supabase response - error:', error);

    return { data, error };
  } catch (error) {
    console.error('[createGoal] Exception:', error);
    return { data: null, error };
  }
};

export const updateGoal = async (id: string, updates: GoalUpdate, userId: string): Promise<{ data: Goal | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('goals')
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

export const deleteGoal = async (id: string, userId: string): Promise<{ data: any | null; error: any }> => {
  try {
    console.log('[deleteGoal] Starting deletion:', { id, userId });
    
    // Usar a nova função RPC para eliminação com restituição
    const { data, error } = await supabase.rpc('delete_goal_with_restoration', {
      goal_id_param: id,
      user_id_param: userId
    });

    if (error) {
      console.error('[deleteGoal] RPC error:', error);
      return { data: null, error };
    }

    console.log('[deleteGoal] Deletion completed successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('[deleteGoal] Exception:', error);
    return { data: null, error };
  }
};

export const allocateToGoal = async (
  goalId: string, 
  accountId: string, 
  amount: number, 
  userId: string, 
  description?: string
): Promise<{ data: any | null; error: any }> => {
  try {
    console.log('[allocateToGoal] Starting allocation:', { goalId, accountId, amount, userId, description });
    
    // Usar uma transação para garantir consistência
    const { data, error } = await supabase.rpc('allocate_to_goal_with_transaction', {
      goal_id_param: goalId,
      account_id_param: accountId,
      amount_param: amount,
      user_id_param: userId,
      description_param: description || 'Alocação para objetivo'
    });

    if (error) {
      console.error('[allocateToGoal] RPC error:', error);
      return { data: null, error };
    }

    console.log('[allocateToGoal] Allocation completed successfully');
    return { data, error: null };
  } catch (error) {
    console.error('[allocateToGoal] Exception:', error);
    return { data: null, error };
  }
};

export const getGoalProgress = async (): Promise<{ data: GoalProgressRPC[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_user_goal_progress');
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};