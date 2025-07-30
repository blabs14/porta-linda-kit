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
    
    // Verificar se é uma conta de cartão de crédito
    const { data: account } = await supabase
      .from('accounts')
      .select('tipo')
      .eq('id', transactionData.account_id)
      .single();
    
    if (account?.tipo === 'cartão de crédito') {
      // Usar lógica específica para cartões de crédito
      const { data, error } = await supabase.rpc('handle_credit_card_transaction', {
        p_user_id: userId,
        p_account_id: transactionData.account_id,
        p_valor: transactionData.valor,
        p_data: transactionData.data,
        p_categoria_id: transactionData.categoria_id,
        p_tipo: transactionData.tipo,
        p_descricao: transactionData.descricao || null,
        p_goal_id: transactionData.goal_id || null
      });
      
      if (error) {
        return { data: null, error };
      }
      
      // Buscar a transação criada
      const result = data as any;
      const { data: createdTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', result.transaction_id)
        .single();
      
      return { data: createdTransaction, error: fetchError };
    } else {
      // Lógica normal para outras contas
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
    }
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