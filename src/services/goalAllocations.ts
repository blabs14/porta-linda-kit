import { supabase } from '../lib/supabaseClient';
import { 
  GoalAllocation, 
  GoalAllocationInsert, 
  GoalAllocationUpdate 
} from '../integrations/supabase/types';

export const getGoalAllocations = async (goalId: string): Promise<{ data: GoalAllocation[] | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('*')
      .eq('goal_id', goalId)
      .order('data_alocacao', { ascending: false });

    return { data: data || null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAllGoalAllocations = async (): Promise<{ data: GoalAllocation[] | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('*')
      .order('data_alocacao', { ascending: false });

    return { data: data || null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createGoalAllocation = async (allocationData: GoalAllocationInsert, userId: string): Promise<{ data: GoalAllocation | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .insert([{ ...allocationData, user_id: userId }])
      .select()
      .single();

    return { data: data || null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateGoalAllocation = async (id: string, updates: GoalAllocationUpdate, userId: string): Promise<{ data: GoalAllocation | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data: data || null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteGoalAllocation = async (id: string, userId: string): Promise<{ data: boolean | null; error: unknown }> => {
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

export const getGoalAllocationsTotal = async (goalId: string, userId: string): Promise<{ data: number | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('valor')
      .eq('goal_id', goalId)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error };
    }

    const rows = (data as { valor: number | null }[] | null) || [];
    const total = rows.reduce((sum, allocation) => sum + (allocation.valor || 0), 0);
    return { data: total, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAccountAllocationsTotal = async (accountId: string, userId: string): Promise<{ data: number | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('valor')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error };
    }

    const rows = (data as { valor: number | null }[] | null) || [];
    const total = rows.reduce((sum, allocation) => sum + (allocation.valor || 0), 0);
    return { data: total, error: null };
  } catch (error) {
    return { data: null, error };
  }
}; 

export const deallocateFromGoal = async (
  goalId: string,
  accountId: string,
  amount: number,
  userId: string
): Promise<{ data: { amountReleased: number } | null; error: unknown }> => {
  try {
    const amountRequested = Math.abs(amount);
    // Buscar alocações existentes para este objetivo/conta do utilizador, mais recentes primeiro
    const { data: rows, error: fetchErr } = await supabase
      .from('goal_allocations')
      .select('id, valor')
      .eq('goal_id', goalId)
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .order('data_alocacao', { ascending: false });
    if (fetchErr) return { data: null, error: fetchErr };

    let remaining = amountRequested;
    for (const row of (rows as { id: string; valor: number | null }[]) || []) {
      if (remaining <= 0) break;
      const current = Math.max(0, Number(row.valor || 0));
      if (current <= 0) continue;
      if (current <= remaining) {
        // Apagar a linha inteira
        const { error: delErr } = await supabase
          .from('goal_allocations')
          .delete()
          .eq('id', row.id)
          .eq('user_id', userId);
        if (delErr) return { data: null, error: delErr };
        remaining -= current;
      } else {
        // Reduzir parcialmente
        const { error: updErr } = await supabase
          .from('goal_allocations')
          .update({ valor: current - remaining })
          .eq('id', row.id)
          .eq('user_id', userId);
        if (updErr) return { data: null, error: updErr };
        remaining = 0;
      }
    }

    const amountReleased = amountRequested - remaining;
    return { data: { amountReleased }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};