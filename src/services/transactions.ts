import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';

export interface CreateTransactionData {
  account_id: string;
  valor: number;
  categoria_id: string;
  data: string;
  descricao?: string;
  tipo: string;
  goal_id?: string;
}

export interface UpdateTransactionData {
  account_id?: string;
  valor?: number;
  categoria_id?: string;
  data?: string;
  descricao?: string;
  tipo?: string;
  goal_id?: string;
}

export const getTransactions = async () => {
  const res = await supabase
    .from('transactions')
    .select('*')
    .order('data', { ascending: false });
  console.log('[DEBUG] getTransactions result:', res);
  return res;
};

// Função para calcular e atualizar o saldo de uma conta
const updateAccountBalance = async (accountId: string, userId: string) => {
  console.log('🔄 Atualizando saldo da conta:', accountId);
  
  // Calcular o saldo total das transações
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('valor, tipo')
    .eq('account_id', accountId);

  if (transactionsError) {
    console.error('❌ Erro ao buscar transações para cálculo de saldo:', transactionsError);
    return;
  }

  // Calcular saldo: receitas (+) - despesas (-)
  const balance = transactions?.reduce((total, transaction) => {
    const valor = Number(transaction.valor) || 0;
    return transaction.tipo === 'receita' ? total + valor : total - valor;
  }, 0) || 0;

  console.log('💰 Saldo calculado:', balance);

  // Atualizar o saldo na conta
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ saldo: balance })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ Erro ao atualizar saldo da conta:', updateError);
  } else {
    console.log('✅ Saldo da conta atualizado com sucesso');
  }
};

export const createTransaction = async (data: CreateTransactionData, userId: string) => {
  console.log('🔍 createTransaction: dados recebidos:', data);
  console.log('🔍 createTransaction: user ID:', userId);

  if (!userId) {
    throw new Error('Utilizador não autenticado');
  }

  const payload = {
    ...data,
    user_id: userId,
  };

  console.log('📦 Payload para criação:', payload);

  const res = await supabase.from('transactions').insert(payload).select('*').single();

  if (res.error) {
    console.error('❌ Erro ao criar transação:', res.error);
    throw res.error;
  }

  console.log('✅ Transação criada com sucesso:', res.data);

  // Atualizar o saldo da conta automaticamente
  if (res.data?.account_id) {
    try {
      await updateAccountBalance(res.data.account_id, userId);
    } catch (balanceError) {
      console.warn('⚠️ Erro ao atualizar saldo da conta (não crítico):', balanceError);
    }
  }

  if (res.data?.id) {
    try {
      await logAuditChange(userId, 'transactions', 'CREATE', res.data.id, {}, payload);
    } catch (auditError) {
      console.warn('⚠️ Erro no log de auditoria (não crítico):', auditError);
    }
  }

  return res;
};

export const updateTransaction = async (id: string, data: UpdateTransactionData, userId: string) => {
  const oldRes = await supabase.from('transactions').select('*').eq('id', id).single();
  const res = await supabase.from('transactions').update(data).eq('id', id);
  
  // Atualizar saldo da conta se a transação foi modificada
  if (res.data && (oldRes.data?.account_id || data.account_id)) {
    try {
      const accountId = data.account_id || oldRes.data?.account_id;
      if (accountId) {
        await updateAccountBalance(accountId, userId);
      }
    } catch (balanceError) {
      console.warn('⚠️ Erro ao atualizar saldo da conta (não crítico):', balanceError);
    }
  }
  
  await logAuditChange(userId, 'transactions', 'UPDATE', id, oldRes.data || {}, data);
  return res;
};

export const deleteTransaction = async (id: string, userId: string) => {
  const oldRes = await supabase.from('transactions').select('*').eq('id', id).single();
  const res = await supabase.from('transactions').delete().eq('id', id);
  
  // Atualizar saldo da conta se a transação foi eliminada
  if (oldRes.data?.account_id) {
    try {
      await updateAccountBalance(oldRes.data.account_id, userId);
    } catch (balanceError) {
      console.warn('⚠️ Erro ao atualizar saldo da conta (não crítico):', balanceError);
    }
  }
  
  await logAuditChange(userId, 'transactions', 'DELETE', id, oldRes.data || {}, {});
  return res;
};