import { supabase } from '../lib/supabaseClient';
import { 
  Transaction, 
  TransactionInsert, 
  TransactionUpdate 
} from '../integrations/supabase/types';
import { TransactionDomain, mapTransactionRowToDomain } from '../shared/types/transactions';

export const getTransactions = async (): Promise<{ data: Transaction[] | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    return { data: data as Transaction[] | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getTransaction = async (id: string): Promise<{ data: Transaction | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Transaction | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createTransaction = async (transactionData: TransactionInsert, userId: string): Promise<{ data: Transaction | null; error: unknown }> => {
  try {
    // Verificar se é uma conta de cartão de crédito
    const { data: account } = await supabase
      .from('accounts')
      .select('tipo')
      .eq('id', transactionData.account_id)
      .single();
    
    if (account?.tipo === 'cartão de crédito') {
      const { data, error } = await supabase.rpc('handle_credit_card_transaction', {
        p_user_id: userId,
        p_account_id: transactionData.account_id,
        p_valor: transactionData.valor,
        p_data: transactionData.data,
        p_categoria_id: transactionData.categoria_id,
        p_tipo: transactionData.tipo,
        p_descricao: transactionData.descricao || null,
        p_goal_id: transactionData.goal_id ?? null
      });
    
      if (error) {
        return { data: null, error };
      }
    
      const result = (data ?? {}) as { transaction_id?: string };
      if (!result.transaction_id) return { data: null, error: new Error('Transação não criada') };

      const { data: createdTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', result.transaction_id)
        .single();
    
      return { data: createdTransaction as Transaction | null, error: fetchError };
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transactionData, user_id: userId }])
        .select()
        .single();

      if (!error && data) {
        try {
          await supabase.rpc('update_account_balance', {
            account_id_param: (data as Pick<Transaction, 'account_id'>).account_id
          });
        } catch (balanceError) {
          console.warn('Erro ao atualizar saldo da conta:', balanceError);
        }
      }

      return { data: data as Transaction | null, error };
    }
  } catch (error) {
    return { data: null, error };
  }
};

export const updateTransaction = async (id: string, updates: TransactionUpdate, userId: string): Promise<{ data: Transaction | null; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      try {
        await supabase.rpc('update_account_balance', {
          account_id_param: (data as Pick<Transaction, 'account_id'>).account_id
        });
      } catch (balanceError) {
        console.warn('Erro ao atualizar saldo da conta:', balanceError);
      }
    }

    return { data: data as Transaction | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteTransaction = async (id: string, userId: string): Promise<{ data: boolean | null; error: unknown }> => {
  try {
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
        await supabase.rpc('update_account_balance', {
          account_id_param: (transaction as Pick<Transaction, 'account_id'>).account_id
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

export const getPersonalTransactions = async (): Promise<{ data: Transaction[] | null; error: unknown }> => {
  try {
    const { data, error } = await supabase.rpc('get_personal_transactions');
    return { data: data as Transaction[] | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getFamilyTransactions = async (): Promise<{ data: Transaction[] | null; error: unknown }> => {
  try {
    const { data, error } = await supabase.rpc('get_family_transactions');
    return { data: data as Transaction[] | null, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Versões em domínio (opcionais)
export const getTransactionsDomain = async (): Promise<{ data: TransactionDomain[] | null; error: unknown }> => {
  const { data, error } = await getTransactions();
  return { data: (data || []).map(mapTransactionRowToDomain), error };
};

export const getTransactionDomain = async (id: string): Promise<{ data: TransactionDomain | null; error: unknown }> => {
  const { data, error } = await getTransaction(id);
  return { data: data ? mapTransactionRowToDomain(data) : null, error };
};

export const createTransactionDomain = async (transactionData: TransactionInsert, userId: string): Promise<{ data: TransactionDomain | null; error: unknown }> => {
  const { data, error } = await createTransaction(transactionData, userId);
  return { data: data ? mapTransactionRowToDomain(data) : null, error };
};

export const updateTransactionDomain = async (id: string, updates: TransactionUpdate, userId: string): Promise<{ data: TransactionDomain | null; error: unknown }> => {
  const { data, error } = await updateTransaction(id, updates, userId);
  return { data: data ? mapTransactionRowToDomain(data) : null, error };
};

export const getCreditCardSummary = async (cardAccountId: string): Promise<{ data: { saldo: number; total_gastos: number; total_pagamentos: number; status: string; ciclo_inicio: string } | null; error: unknown }> => {
  try {
    // Alguns tipos gerados podem exigir p_user_id; a função atual só usa p_account_id
    const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc('get_credit_card_summary', {
      p_account_id: cardAccountId
    });
    if (error) return { data: null, error };
    const row = Array.isArray(data) ? (data as unknown[])[0] : data;
    if (!row) return { data: null, error: null };
    const shaped = {
      saldo: Number((row as Record<string, unknown>).saldo ?? 0),
      total_gastos: Number((row as Record<string, unknown>).total_gastos ?? 0),
      total_pagamentos: Number((row as Record<string, unknown>).total_pagamentos ?? 0),
      status: String((row as Record<string, unknown>).status ?? ''),
      ciclo_inicio: String((row as Record<string, unknown>).ciclo_inicio ?? '')
    };
    return { data: shaped, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const payCreditCardFromAccount = async (
  userId: string,
  cardAccountId: string,
  bankAccountId: string,
  amount: number,
  dateISO: string,
  descricao?: string
): Promise<{ data: boolean | null; error: unknown }> => {
  try {
    const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc('pay_credit_card_from_account', {
      p_user_id: userId,
      p_card_account_id: cardAccountId,
      p_bank_account_id: bankAccountId,
      p_amount: amount,
      p_date: dateISO,
      p_descricao: descricao ?? null
    });
    return { data: Boolean(data), error };
  } catch (error) {
    return { data: null, error };
  }
};