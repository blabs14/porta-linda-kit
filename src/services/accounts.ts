import { supabase } from '../lib/supabaseClient';
import { 
  Account, 
  AccountInsert, 
  AccountUpdate, 
  AccountWithBalances,
  AccountBalance,
  AccountReserved
} from '../integrations/supabase/types';

export const getAccounts = async (): Promise<{ data: Account[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('nome');

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

export const createAccount = async (accountData: AccountInsert, userId: string): Promise<{ data: Account | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...accountData, user_id: userId }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateAccount = async (id: string, updates: AccountUpdate, userId: string): Promise<{ data: Account | null; error: any }> => {
  try {
    let otherUpdates = updates;

    // Se o saldo está sendo alterado, precisamos criar uma transação de ajuste
    if (updates.saldo !== undefined) {
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
      const currentBalance = currentBalanceData?.saldo_atual || 0;
      const newBalance = updates.saldo || 0;
      const difference = newBalance - currentBalance;

      // Se há diferença, criar uma transação de ajuste
      if (difference !== 0) {
        // Buscar categoria "Ajuste" ou criar se não existir
        let categoryId: string | null = null;
        
        // Tentar buscar categoria existente
        const { data: ajusteCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('nome', 'Ajuste')
          .eq('user_id', userId)
          .single();

        if (ajusteCategory) {
          categoryId = ajusteCategory.id;
        } else {
          // Criar categoria "Ajuste" se não existir
          const { data: newCategory, error: createCategoryError } = await supabase
            .from('categories')
            .insert([{
              nome: 'Ajuste',
              user_id: userId,
              cor: '#6B7280' // Cor cinza
            }])
            .select('id')
            .single();

          if (createCategoryError) {
            console.error('Erro ao criar categoria Ajuste:', createCategoryError);
            return { data: null, error: createCategoryError };
          }
          categoryId = newCategory?.id || null;
        }

        if (categoryId) {
          // Criar transação de ajuste
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert([{
              account_id: id,
              categoria_id: categoryId,
              user_id: userId,
              valor: Math.abs(difference),
              tipo: difference > 0 ? 'receita' : 'despesa',
              data: new Date().toISOString().split('T')[0],
              descricao: `Ajuste de saldo: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}€`
            }]);

          if (transactionError) {
            return { data: null, error: transactionError };
          }
        }
      }

      // Remover o saldo dos updates pois agora usamos transações
      const { saldo, ...rest } = updates;
      otherUpdates = rest;
    }

    // Atualizar apenas os outros campos (nome, tipo, etc.)
    const { data, error } = await supabase
      .from('accounts')
      .update(otherUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteAccount = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    // Verificar se a conta existe e pertence ao utilizador
    const { data: account, error: checkError } = await supabase
      .from('accounts')
      .select('id, nome')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !account) {
      return { 
        data: null, 
        error: { message: 'Conta não encontrada ou não pertence ao utilizador' } 
      };
    }

    // Eliminar a conta
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Funções RPC para dados calculados
export const getAccountBalances = async (): Promise<{ data: AccountBalance[] | null; error: any }> => {
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

export const getAccountsWithBalances = async (): Promise<{ data: AccountWithBalances[] | null; error: any }> => {
  try {
    console.log('[getAccountsWithBalances] Fetching accounts with balances...');
    
    // Usar a função RPC que já combina tudo
    const { data, error } = await supabase.rpc('get_user_accounts_with_balances');

    if (error) {
      console.error('[getAccountsWithBalances] RPC error:', error);
      return { data: null, error };
    }

    console.log('[getAccountsWithBalances] RPC result:', data);
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[getAccountsWithBalances] Exception:', error);
    return { data: null, error };
  }
};