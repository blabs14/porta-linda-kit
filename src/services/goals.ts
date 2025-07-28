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

export const deleteGoal = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { data: !error, error };
  } catch (error) {
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
    
    // 1. Criar a alocação
    const { data: allocation, error: allocationError } = await supabase
      .from('goal_allocations')
      .insert([{
        goal_id: goalId,
        account_id: accountId,
        valor: amount,
        descricao: description || 'Alocação para objetivo',
        user_id: userId,
        data_alocacao: new Date().toISOString()
      }])
      .select()
      .single();

    console.log('[allocateToGoal] Allocation result:', { allocation, allocationError });

    if (allocationError) {
      console.error('[allocateToGoal] Allocation error:', allocationError);
      return { data: null, error: allocationError };
    }

    // 2. Buscar ou criar a categoria "Objetivos"
    let categoriaId = null;
    try {
      // Primeiro, tentar encontrar a categoria "Objetivos"
      const { data: categoria, error: categoriaError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('nome', 'Objetivos')
        .single();

      if (categoria && !categoriaError) {
        categoriaId = categoria.id;
        console.log('[allocateToGoal] Found "Objetivos" category:', categoriaId);
      } else {
        // Se não encontrar, criar a categoria "Objetivos"
        const { data: novaCategoria, error: novaCategoriaError } = await supabase
          .from('categories')
          .insert([{
            nome: 'Objetivos',
            user_id: userId,
            cor: '#3B82F6'
          }])
          .select('id')
          .single();

        if (novaCategoria && !novaCategoriaError) {
          categoriaId = novaCategoria.id;
          console.log('[allocateToGoal] Created "Objetivos" category:', categoriaId);
        } else {
          console.error('[allocateToGoal] Failed to create "Objetivos" category:', novaCategoriaError);
          return { data: null, error: novaCategoriaError };
        }
      }
    } catch (error) {
      console.error('[allocateToGoal] Error finding/creating "Objetivos" category:', error);
      return { data: null, error };
    }

    if (!categoriaId) {
      console.error('[allocateToGoal] No valid category found');
      return { data: null, error: 'No valid category found' };
    }

    // 3. Criar a transação de débito
    const transactionData = {
      account_id: accountId,
      categoria_id: categoriaId,
      valor: amount,
      tipo: 'despesa',
      data: new Date().toISOString(),
      descricao: description || 'Alocação para objetivo',
      goal_id: goalId,
      user_id: userId
    };

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    console.log('[allocateToGoal] Transaction result:', { transaction, transactionError });

    if (transactionError) {
      console.error('[allocateToGoal] Transaction error:', transactionError);
      return { data: null, error: transactionError };
    }

    // 4. Atualizar saldo da conta
    try {
      await supabase.rpc('update_account_balance', {
        account_id_param: accountId
      });
      console.log('[allocateToGoal] Account balance updated');
    } catch (balanceError) {
      console.warn('[allocateToGoal] Error updating account balance:', balanceError);
    }

    console.log('[allocateToGoal] Allocation completed successfully');
    return { data: { allocation, transaction }, error: null };
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