import { supabase } from '../lib/supabaseClient';
import { 
  Account, 
  AccountInsert, 
  AccountUpdate, 
  AccountUpdateExtended,
  AccountWithBalances,
  AccountBalance,
  AccountReserved
} from '../integrations/supabase/types';

export const getAccounts = async (userId?: string): Promise<{ data: Account[] | null; error: any }> => {
  try {
    let query = supabase
      .from('accounts')
      .select('*')
      .order('nome');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAccount = async (id: string): Promise<{ data: Account | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createAccount = async (accountData: AccountInsert, userId?: string): Promise<{ data: Account | null; error: any }> => {
  try {
    const resolvedUserId = userId ?? (accountData as any)?.user_id;

    // Ajustar saldo inicial para cartões de crédito
    let adjustedData = { ...accountData } as any;
    if ((adjustedData.tipo === 'cartão de crédito') && ((adjustedData.saldo || 0) > 0)) {
      adjustedData = { ...adjustedData, saldo: 0 }; // Cartões de crédito começam com saldo 0
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...adjustedData, user_id: resolvedUserId }])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Aplicar lógica específica para cartões de crédito
    if ((data as any) && (data as any).tipo === 'cartão de crédito') {
      const { error: creditCardError } = await supabase.rpc('handle_credit_card_account', {
        p_account_id: (data as any).id,
        p_user_id: resolvedUserId,
        p_operation: 'create'
      });

      if (creditCardError) {
        console.warn('Aviso ao aplicar lógica de cartão de crédito:', creditCardError);
      }
    }

    return { data: data as any, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateAccount = async (id: string, updates: AccountUpdateExtended, userId?: string): Promise<{ data: Account | null; error: any }> => {
  try {
    const resolvedUserId = userId;
    console.log('[updateAccount] Starting update for account:', id);
    console.log('[updateAccount] Updates:', updates);
    
    // Se apenas nome e tipo estão sendo atualizados, fazer update simples
    if (Object.keys(updates).length === 2 && (updates as any).nome !== undefined && (updates as any).tipo !== undefined) {
      console.log('[updateAccount] Simple update - only nome and tipo');
      let query = supabase
        .from('accounts')
        .update({ nome: (updates as any).nome, tipo: (updates as any).tipo })
        .eq('id', id);
      if (resolvedUserId) query = query.eq('user_id', resolvedUserId);
      const { data, error } = await query
        .select()
        .single();

      console.log('[updateAccount] Simple update result:', { data, error });
      return { data: data as any, error };
    }
    
    // Para atualizações que incluem saldos, usar a lógica original
    let otherUpdates = updates as any;
    let needsAdjustmentTransaction = false;
    let adjustmentAmount = 0;

    // Processar saldoAtual se fornecido
    if ((updates as any).saldoAtual !== undefined) {
      console.log('[updateAccount] Processing saldoAtual:', (updates as any).saldoAtual);
      
      // Buscar o tipo da conta
      const { data: accountData } = await supabase
        .from('accounts')
        .select('tipo')
        .eq('id', id)
        .single();

      // Lógica especializada para cartões de crédito
      if ((accountData as any)?.tipo === 'cartão de crédito') {
        console.log('[updateAccount] Using manage_credit_card_balance RPC');
        
        // Para cartões de crédito, usar função especializada
        const { data: result, error: rpcError } = await supabase.rpc('manage_credit_card_balance', {
          p_user_id: resolvedUserId,
          p_account_id: id,
          p_new_balance: (updates as any).saldoAtual || 0
        });

        console.log('[updateAccount] RPC result:', result);

        if (rpcError) {
          console.error('[updateAccount] RPC error:', rpcError);
          return { data: null, error: rpcError };
        }

        // Buscar a conta atualizada
        const { data: updatedAccount, error: fetchError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', id)
          .single();

        console.log('[updateAccount] Updated account:', updatedAccount);
        console.log('[updateAccount] Fetch error:', fetchError);

        if (fetchError) {
          return { data: null, error: fetchError };
        }

        console.log('[updateAccount] Returning updated account');
        return { data: updatedAccount as any, error: null };
      }
      
      // Para outras contas, usar lógica normal
      const { data: currentBalanceData, error: balanceError } = await supabase
        .from('account_balances')
        .select('saldo_atual')
        .eq('account_id', id)
        .single();

      if (balanceError) {
        return { data: null, error: balanceError };
      }

      const currentBalance = (currentBalanceData as any)?.saldo_atual || 0;
      const newBalance = (updates as any).saldoAtual || 0;
      const difference = newBalance - currentBalance;

      if (difference !== 0) {
        needsAdjustmentTransaction = true;
        adjustmentAmount = difference;
      }

      // Remover saldoAtual dos updates pois será tratado via transação
      const { saldoAtual, ...rest } = updates as any;
      otherUpdates = rest;
    }

    // Processar ajusteSaldo se fornecido
    if ((updates as any).ajusteSaldo !== undefined && (updates as any).ajusteSaldo !== 0) {
      needsAdjustmentTransaction = true;
      adjustmentAmount = (updates as any).ajusteSaldo;
      
      // Remover ajusteSaldo dos updates pois será tratado via transação
      const { ajusteSaldo, ...rest } = otherUpdates as any;
      otherUpdates = rest;
    }

    // Se o saldo está sendo alterado, precisamos criar uma transação de ajuste
    if ((updates as any).saldo !== undefined) {
      // Buscar o saldo atual calculado da conta
      const { data: currentBalanceData, error: balanceError } = await supabase
        .from('account_balances')
        .select('saldo_atual')
        .eq('account_id', id)
        .single();

      if (balanceError) {
        return { data: null, error: balanceError };
      }

      // Calcular a diferença entre o novo saldo e o saldo atual calculado
      const currentBalance = (currentBalanceData as any)?.saldo_atual || 0;
      const newBalance = (updates as any).saldo || 0;
      const difference = newBalance - currentBalance;

      // Se há diferença, criar uma transação de ajuste
      if (difference !== 0) {
        needsAdjustmentTransaction = true;
        adjustmentAmount = difference;
      }

      // Remover o saldo dos updates pois agora usamos transações
      const { saldo, ...rest } = otherUpdates as any;
      otherUpdates = rest;
    }

    // Criar transação de ajuste se necessário
    if (needsAdjustmentTransaction && adjustmentAmount !== 0) {
      // Buscar categoria "Ajuste" ou criar se não existir
      let categoryId: string | null = null;
      
      // Tentar buscar categoria existente
      const { data: ajusteCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('nome', 'Ajuste')
        .eq('user_id', resolvedUserId as any)
        .single();

      if (ajusteCategory) {
        categoryId = (ajusteCategory as any).id;
      } else {
        // Criar categoria "Ajuste" se não existir
        const { data: newCategory, error: createCategoryError } = await supabase
          .from('categories')
          .insert([{
            nome: 'Ajuste',
            user_id: resolvedUserId as any,
            cor: '#6B7280' // Cor cinza
          }])
          .select('id')
          .single();

        if (createCategoryError) {
          console.error('Erro ao criar categoria Ajuste:', createCategoryError);
          return { data: null, error: createCategoryError };
        }
        categoryId = (newCategory as any)?.id || null;
      }

      if (categoryId) {
        // Criar transação de ajuste
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            account_id: id,
            categoria_id: categoryId,
            user_id: resolvedUserId as any,
            valor: Math.abs(adjustmentAmount),
            tipo: adjustmentAmount > 0 ? 'receita' : 'despesa',
            data: new Date().toISOString().split('T')[0],
            descricao: `Ajuste de saldo: ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount.toFixed(2)}€`
          }]);

        if (transactionError) {
          return { data: null, error: transactionError };
        }
      }
    }

    // Atualizar apenas os outros campos (nome, tipo, etc.)
    let updateQuery = supabase
      .from('accounts')
      .update(otherUpdates as any)
      .eq('id', id);
    if (resolvedUserId) updateQuery = updateQuery.eq('user_id', resolvedUserId);
    const { data, error } = await updateQuery
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteAccount = async (id: string, userId?: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) return { data: null, error: authError };
      resolvedUserId = userData?.user?.id as string | undefined;
    }
    if (!resolvedUserId) {
      return { data: null, error: { message: 'userId required' } };
    }
    // Usar a função RPC que elimina a conta e todos os dados relacionados
    const { data, error } = await supabase.rpc('delete_account_with_related_data', {
      p_account_id: id,
      p_user_id: resolvedUserId
    });

    if (error) {
      return { data: null, error };
    }

    // Verificar se a operação foi bem-sucedida
    if (data && typeof data === 'object' && 'success' in (data as any)) {
      const result = data as any;
      if (result.success) {
        return { data: true, error: null };
      } else {
        return { data: null, error: { message: (result as any).error || 'Erro ao eliminar conta' } };
      }
    }

    return { data: null, error: { message: 'Resposta inesperada do servidor' } };
  } catch (error) {
    return { data: null, error };
  }
};

// Funções RPC para dados calculados
export const getAccountBalances = async (): Promise<{ data: import('../integrations/supabase/types').AccountBalanceRPC[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_user_account_balances');
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAccountReserved = async (): Promise<{ data: AccountReserved[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_user_account_reserved');
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAccountsWithBalances = async (userId?: string): Promise<{ data: AccountWithBalances[] | null; error: any }> => {
  try {
    if (!userId) {
      return { data: [], error: null };
    }
    
    // Usar a função RPC que já combina tudo
    const { data, error } = await supabase.rpc('get_user_accounts_with_balances', {
      p_user_id: userId
    });

    if (error) {
      console.error('[getAccountsWithBalances] RPC error:', error);
      return { data: null, error };
    }

    return { data: (data as any) || [], error: null };
  } catch (error) {
    console.error('[getAccountsWithBalances] Exception:', error);
    return { data: null, error };
  }
};

export const getPersonalAccountsWithBalances = async (userId?: string): Promise<{ data: AccountWithBalances[] | null; error: any }> => {
  try {
    // Usar a função RPC existente e filtrar contas pessoais (sem family_id)
    const { data, error } = await supabase.rpc('get_user_accounts_with_balances', {
      p_user_id: userId || null
    });

    if (error) {
      console.error('[getPersonalAccountsWithBalances] RPC error:', error);
      return { data: null, error };
    }

    // Filtrar apenas contas pessoais (sem family_id)
    const personalAccounts = (data as any)?.filter((account: any) => !account.family_id) || [];
    
    return { data: personalAccounts, error: null };
  } catch (error) {
    console.error('[getPersonalAccountsWithBalances] Exception:', error);
    return { data: null, error };
  }
};

export const getFamilyAccountsWithBalances = async (userId?: string): Promise<{ data: AccountWithBalances[] | null; error: any }> => {
  try {
    console.log('[getFamilyAccountsWithBalances] Fetching family accounts with balances...');
    console.log('[getFamilyAccountsWithBalances] userId:', userId);
    
    // Usar a função RPC existente e filtrar contas familiares (com family_id)
    const { data, error } = await supabase.rpc('get_user_accounts_with_balances', {
      p_user_id: userId || null
    });

    if (error) {
      console.error('[getFamilyAccountsWithBalances] RPC error:', error);
      return { data: null, error };
    }

    // Filtrar apenas contas familiares (com family_id)
    const familyAccounts = (data as any)?.filter((account: any) => account.family_id) || [];
    
    console.log('[getFamilyAccountsWithBalances] RPC result:', data);
    console.log('[getFamilyAccountsWithBalances] Family accounts filtered:', familyAccounts);
    return { data: familyAccounts, error: null };
  } catch (error) {
    console.error('[getFamilyAccountsWithBalances] Exception:', error);
    return { data: null, error };
  }
};

// Função para obter KPIs pessoais otimizada
export const getPersonalKPIs = async () => {
  const { data, error } = await supabase.rpc('get_personal_kpis');
  
  if (error) {
    console.error('Error fetching personal KPIs:', error);
    throw error;
  }
  
  return {
    data: (data as any)?.[0] || {
      total_balance: 0,
      credit_card_debt: 0,
      top_goal_progress: 0,
      monthly_savings: 0,
      goals_account_balance: 0,
      total_goals_value: 0,
      goals_progress_percentage: 0,
      total_budget_spent: 0,
      total_budget_amount: 0,
      budget_spent_percentage: 0
    },
    error: null
  };
};