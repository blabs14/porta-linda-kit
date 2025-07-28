import { supabase } from '../lib/supabaseClient';
import { 
  Transaction, 
  TransactionInsert, 
  TransactionUpdate 
} from '../integrations/supabase/types';

export const getTransactions = async (): Promise<{ data: Transaction[] | null; error: any }> => {
  try {
    console.log('[getTransactions] Fetching transactions...');
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('[getTransactions] Supabase response - data:', data);
    console.log('[getTransactions] Supabase response - error:', error);
    console.log('[getTransactions] Number of transactions:', data?.length || 0);
    
    // Mostrar as primeiras 3 transações para verificar ordenação
    if (data && data.length > 0) {
      console.log('[getTransactions] First 3 transactions:');
      data.slice(0, 3).forEach((tx, index) => {
        console.log(`[getTransactions] ${index + 1}. ID: ${tx.id}, Created: ${tx.created_at}, Data: ${tx.data}, Descrição: ${tx.descricao}`);
      });
    }

    return { data, error };
  } catch (error) {
    console.error('[getTransactions] Exception:', error);
    return { data: null, error };
  }
};

export const getTransaction = async (id: string): Promise<{ data: Transaction | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createTransaction = async (transactionData: TransactionInsert, userId: string): Promise<{ data: Transaction | null; error: any }> => {
  try {
    console.log('[createTransaction] transactionData:', transactionData);
    console.log('[createTransaction] userId:', userId);
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transactionData, user_id: userId }])
      .select()
      .single();

    console.log('[createTransaction] Supabase response - data:', data);
    console.log('[createTransaction] Supabase response - error:', error);

    if (!error && data) {
      try {
        // Atualizar saldo da conta
        await supabase.rpc('update_account_balance', {
          account_id_param: data.account_id
        });
      } catch (balanceError) {
        console.warn('Erro ao atualizar saldo da conta:', balanceError);
      }
    }

    return { data, error };
  } catch (error) {
    console.error('[createTransaction] Exception:', error);
    return { data: null, error };
  }
};

export const updateTransaction = async (id: string, updates: TransactionUpdate, userId: string): Promise<{ data: Transaction | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      try {
        // Atualizar saldo da conta
        await supabase.rpc('update_account_balance', {
          account_id_param: data.account_id
        });
      } catch (balanceError) {
        console.warn('Erro ao atualizar saldo da conta:', balanceError);
      }
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteTransaction = async (id: string, userId: string): Promise<{ data: boolean | null; error: any }> => {
  try {
    // Buscar a transação antes de apagar para obter account_id
    const { data: transaction } = await supabase
      .from('transactions')
      .select('account_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (!error && transaction) {
      try {
        // Atualizar saldo da conta
        await supabase.rpc('update_account_balance', {
          account_id_param: transaction.account_id
        });
      } catch (balanceError) {
        console.warn('Erro ao atualizar saldo da conta:', balanceError);
      }
    }

    return { data: !error, error };
  } catch (error) {
    return { data: null, error };
  }
};