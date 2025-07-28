import { supabase } from '../lib/supabaseClient';
import { logAuditChange } from './audit_logs';
import { createTransaction, CreateTransactionData } from './transactions';
import { createGoalAllocation, getGoalAllocationsTotal } from './goalAllocations';

export interface Goal {
  id: string;
  user_id: string;
  nome: string;
  valor_objetivo: number;
  valor_atual: number;
  prazo: string;
  created_at: string;
  updated_at: string;
  family_id?: string;
  ativa?: boolean;
  status?: string;
  valor_meta?: number;
  account_id?: string;
}

export interface CreateGoalData {
  nome: string;
  valor_objetivo: number;
  valor_atual?: number;
  prazo: string;
  status?: string;
  ativa?: boolean;
  account_id?: string;
  family_id?: string;
}

export interface UpdateGoalData {
  nome?: string;
  valor_objetivo?: number;
  valor_atual?: number;
  prazo?: string;
  status?: string;
  ativa?: boolean;
  account_id?: string;
  family_id?: string;
}

// Listar objetivos
export const getGoals = async (userId: string) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar objetivos:', error);
    throw error;
  }

  return data || [];
};

// Buscar objetivo por ID
export const getGoal = async (id: string, userId: string) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar objetivo:', error);
    throw error;
  }

  return data;
};

// Criar objetivo
export const createGoal = async (data: CreateGoalData, userId: string) => {
  const payload = {
    ...data,
    user_id: userId,
    valor_atual: data.valor_atual || 0,
    ativa: data.ativa !== undefined ? data.ativa : true,
    status: data.status || 'active'
  };

  console.log('🔍 Tentando criar objetivo com payload:', payload);

  const { data: goal, error } = await supabase
    .from('goals')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Erro ao criar objetivo:', error);
    throw error;
  }

  console.log('✅ Objetivo criado com sucesso:', goal);

  // Sincronizar conta "Objetivos" após criar objetivo
  try {
    await syncObjetivosAccount(userId);
  } catch (syncError) {
    console.warn('⚠️ Erro ao sincronizar conta "Objetivos" (não crítico):', syncError);
  }

  // Log da auditoria (sem falhar se der erro)
  try {
    if (goal?.id) {
      await logAuditChange(userId, 'goals', 'CREATE', goal.id, {}, payload);
    }
  } catch (auditError) {
    console.warn('⚠️ Erro no log de auditoria (não crítico):', auditError);
  }

  return goal;
};

// Atualizar objetivo
export const updateGoal = async (id: string, data: UpdateGoalData, userId: string) => {
  console.log('🔍 Tentando atualizar objetivo:', { id, data, userId });
  
  const oldRes = await supabase.from('goals').select('*').eq('id', id).single();
  const payload = {
    ...data,
    user_id: userId,
  };
  
  const { data: updatedGoal, error } = await supabase.from('goals').update(payload).eq('id', id).select('*').single();
  
  if (error) {
    console.error('❌ Erro ao atualizar objetivo:', error);
    throw error;
  }
  
  console.log('✅ Objetivo atualizado com sucesso:', updatedGoal);
  
  // Verificar se o objetivo foi atingido após a atualização
  try {
    await checkAndNotifyGoalCompletion(id, userId);
  } catch (notifyError) {
    console.warn('⚠️ Erro ao verificar notificação (não crítico):', notifyError);
  }
  
  // Sincronizar conta "Objetivos" após atualizar objetivo
  try {
    await syncObjetivosAccount(userId);
  } catch (syncError) {
    console.warn('⚠️ Erro ao sincronizar conta "Objetivos" (não crítico):', syncError);
  }
  
  // Log da auditoria (sem falhar se der erro)
  try {
    await logAuditChange(userId, 'goals', 'UPDATE', id, oldRes.data || {}, payload);
  } catch (auditError) {
    console.warn('⚠️ Erro no log de auditoria (não crítico):', auditError);
  }
  
  return updatedGoal;
};

// Eliminar objetivo
export const deleteGoal = async (id: string, userId: string) => {
  const oldRes = await supabase.from('goals').select('*').eq('id', id).single();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  
  if (error) {
    console.error('Erro ao eliminar objetivo:', error);
    throw error;
  }
  
  console.log('✅ Objetivo eliminado com sucesso');
  
  // Sincronizar conta "Objetivos" após eliminar objetivo
  try {
    await syncObjetivosAccount(userId);
  } catch (syncError) {
    console.warn('⚠️ Erro ao sincronizar conta "Objetivos" (não crítico):', syncError);
  }
  
  // Log da auditoria (sem falhar se der erro)
  try {
    await logAuditChange(userId, 'goals', 'DELETE', id, oldRes.data || {}, {});
  } catch (auditError) {
    console.warn('⚠️ Erro no log de auditoria (não crítico):', auditError);
  }
};

// Alocar valor a um objetivo (com criação automática de transação)
export const allocateToGoal = async (
  goalId: string, 
  accountId: string, 
  amount: number, 
  userId: string,
  description?: string
) => {
  console.log('🔍 allocateToGoal: Iniciando alocação...', { goalId, accountId, amount, userId, description });

  try {
    // 0. Verificar se o objetivo está completo antes de permitir alocação
    const { data: currentGoal } = await supabase
      .from('goals')
      .select('valor_atual, valor_objetivo, nome')
      .eq('id', goalId)
      .single();

    if (!currentGoal) {
      throw new Error('Objetivo não encontrado');
    }

    const isComplete = isGoalComplete(currentGoal.valor_atual, currentGoal.valor_objetivo);
    if (isComplete) {
      throw new Error(`Objetivo "${currentGoal.nome}" já foi atingido (${((currentGoal.valor_atual / currentGoal.valor_objetivo) * 100).toFixed(1)}%). Edite o valor objetivo ou o valor atual para continuar.`);
    }

    // 1. Criar a alocação na tabela goal_allocations
    console.log('1. Criando alocação...');
    const allocationData = {
      goal_id: goalId,
      account_id: accountId,
      valor: amount,
      descricao: description || 'Alocação para objetivo',
      user_id: userId
    };
    console.log('Dados da alocação:', allocationData);
    
    const allocation = await supabase
      .from('goal_allocations')
      .insert(allocationData)
      .select('*')
      .single();
    
    if (allocation.error) {
      console.error('❌ Erro ao criar alocação:', allocation.error);
      throw allocation.error;
    }
    console.log('✅ Alocação criada:', allocation.data);

    // 2. Atualizar o valor_atual do objetivo
    console.log('2. Atualizando valor_atual do objetivo...');
    const newValorAtual = (Number(currentGoal.valor_atual) || 0) + amount;
    console.log('Novo valor_atual:', newValorAtual);
    
    const goalUpdate = await supabase
      .from('goals')
      .update({ valor_atual: newValorAtual })
      .eq('id', goalId)
      .select('*')
      .single();
    
    if (goalUpdate.error) {
      console.error('❌ Erro ao atualizar objetivo:', goalUpdate.error);
      throw goalUpdate.error;
    }
    console.log('✅ Objetivo atualizado:', goalUpdate.data);

    // 3. Verificar se o objetivo foi atingido e criar notificação
    console.log('3. Verificando se objetivo foi atingido...');
    await checkAndNotifyGoalCompletion(goalId, userId);

    // 4. Criar a transação de débito na conta
    console.log('4. Criando transação...');
    const transactionData: CreateTransactionData = {
      valor: amount,
      data: new Date().toISOString().split('T')[0],
      categoria_id: await getGoalCategoryId(), // Categoria para objetivos
      tipo: 'despesa', // Still explicitly 'despesa' for the transaction
      descricao: description || `Alocação para objetivo`,
      account_id: accountId,
      goal_id: goalId
    };
    console.log('Dados da transação:', transactionData);
    const transaction = await createTransaction(transactionData, userId);
    console.log('✅ Transação criada:', transaction);

    // 5. Sincronizar conta "Objetivos" após alocação
    console.log('5. Sincronizando conta "Objetivos"...');
    try {
      await syncObjetivosAccount(userId);
    } catch (syncError) {
      console.warn('⚠️ Erro ao sincronizar conta "Objetivos" (não crítico):', syncError);
    }

    console.log('🎉 Alocação concluída com sucesso!');
    return {
      allocation: allocation.data,
      goal: goalUpdate.data,
      transaction: transaction.data
    };

  } catch (error) {
    console.error('❌ Erro na alocação:', error);
    throw error;
  }
};

// Buscar categoria para objetivos (usar qualquer categoria disponível)
const getGoalCategoryId = async () => {
  // Primeiro, tentar encontrar a categoria "Objetivos"
  const { data: objetivosCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('nome', 'Objetivos')
    .single();

  if (objetivosCategory) {
    console.log('Usando categoria "Objetivos":', objetivosCategory.id);
    return objetivosCategory.id;
  }

  // Se não encontrar, buscar qualquer categoria disponível
  const { data: anyCategory } = await supabase
    .from('categories')
    .select('id')
    .limit(1)
    .single();

  if (anyCategory) {
    console.log('Usando categoria disponível para objetivos:', anyCategory.id);
    return anyCategory.id;
  }

  throw new Error('Não foi possível encontrar uma categoria para objetivos');
};

// Função para obter ou criar a conta "Objetivos"
const getOrCreateObjetivosAccount = async (userId: string) => {
  console.log('🔍 Procurando conta "Objetivos"...');
  
  // Procurar conta "Objetivos" existente
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('id, saldo')
    .eq('nome', 'Objetivos')
    .eq('user_id', userId)
    .single();

  if (existingAccount) {
    console.log('✅ Conta "Objetivos" encontrada:', existingAccount.id);
    return existingAccount;
  }

  // Criar conta "Objetivos" se não existir
  console.log('🆕 Criando conta "Objetivos"...');
  const { data: newAccount, error } = await supabase
    .from('accounts')
    .insert({
      nome: 'Objetivos',
      tipo: 'poupança',
      saldo: 0,
      user_id: userId
    })
    .select('id, saldo')
    .single();

  if (error) {
    console.error('❌ Erro ao criar conta "Objetivos":', error);
    throw error;
  }

  console.log('✅ Conta "Objetivos" criada:', newAccount.id);
  return newAccount;
};

// Função para calcular o total de todos os objetivos
const calculateTotalGoalsValue = async (userId: string) => {
  const { data: goals } = await supabase
    .from('goals')
    .select('valor_atual')
    .eq('user_id', userId);

  const total = goals?.reduce((sum, goal) => sum + (Number(goal.valor_atual) || 0), 0) || 0;
  console.log('💰 Total dos objetivos:', total);
  return total;
};

// Função para atualizar o saldo da conta "Objetivos"
const updateObjetivosAccountBalance = async (userId: string, newBalance: number) => {
  console.log('🔄 Atualizando saldo da conta "Objetivos" para:', newBalance);
  
  const { error } = await supabase
    .from('accounts')
    .update({ saldo: newBalance })
    .eq('nome', 'Objetivos')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Erro ao atualizar saldo da conta "Objetivos":', error);
    throw error;
  }

  console.log('✅ Saldo da conta "Objetivos" atualizado');
};

// Função para criar transação de ajuste na conta "Objetivos"
const createObjetivosAdjustmentTransaction = async (userId: string, amount: number, description: string) => {
  console.log('📝 Criando transação de ajuste na conta "Objetivos":', amount);
  
  const account = await getOrCreateObjetivosAccount(userId);
  const categoryId = await getGoalCategoryId();
  
  const transactionData = {
    account_id: account.id,
    valor: Math.abs(amount),
    categoria_id: categoryId,
    data: new Date().toISOString().split('T')[0],
    descricao: description,
    tipo: amount > 0 ? 'receita' : 'despesa',
    user_id: userId
  };

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Erro ao criar transação de ajuste:', error);
    throw error;
  }

  console.log('✅ Transação de ajuste criada:', transaction.id);
  return transaction;
};

// Função para sincronizar a conta "Objetivos" com o total dos objetivos
const syncObjetivosAccount = async (userId: string) => {
  console.log('🔄 Sincronizando conta "Objetivos"...');
  
  const totalGoals = await calculateTotalGoalsValue(userId);
  
  // Se não há objetivos, remover a conta "Objetivos"
  if (totalGoals === 0) {
    console.log('🗑️ Removendo conta "Objetivos" (sem objetivos)');
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('nome', 'Objetivos')
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Erro ao remover conta "Objetivos":', error);
    } else {
      console.log('✅ Conta "Objetivos" removida');
    }
    return;
  }

  // Obter ou criar conta "Objetivos"
  const account = await getOrCreateObjetivosAccount(userId);
  const currentBalance = Number(account.saldo) || 0;
  const balanceDifference = totalGoals - currentBalance;

  // Se há diferença, criar transação de ajuste
  if (Math.abs(balanceDifference) > 0.01) {
    console.log('📊 Diferença detectada:', balanceDifference);
    const description = balanceDifference > 0 
      ? 'Ajuste automático - Aumento no valor dos objetivos'
      : 'Ajuste automático - Redução no valor dos objetivos';
    
    await createObjetivosAdjustmentTransaction(userId, balanceDifference, description);
  }

  // Atualizar saldo final
  await updateObjetivosAccountBalance(userId, totalGoals);
  console.log('✅ Conta "Objetivos" sincronizada');
};

// Função para sincronizar todas as contas "Objetivos" (para inicialização)
export const syncAllObjetivosAccounts = async () => {
  console.log('🔄 Sincronizando todas as contas "Objetivos"...');
  
  // Buscar todos os utilizadores que têm objetivos
  const { data: usersWithGoals } = await supabase
    .from('goals')
    .select('user_id')
    .not('user_id', 'is', null);

  if (!usersWithGoals || usersWithGoals.length === 0) {
    console.log('ℹ️ Nenhum utilizador com objetivos encontrado');
    return;
  }

  // Obter IDs únicos de utilizadores
  const uniqueUserIds = [...new Set(usersWithGoals.map(g => g.user_id))];
  console.log('👥 Utilizadores com objetivos:', uniqueUserIds);

  // Sincronizar conta "Objetivos" para cada utilizador
  for (const userId of uniqueUserIds) {
    try {
      console.log(`🔄 Sincronizando para utilizador: ${userId}`);
      await syncObjetivosAccount(userId);
    } catch (error) {
      console.error(`❌ Erro ao sincronizar para utilizador ${userId}:`, error);
    }
  }

  console.log('✅ Sincronização de todas as contas "Objetivos" concluída');
};

// Calcular progresso de um objetivo
export const getGoalProgress = async (goalId: string, userId: string) => {
  const goal = await getGoal(goalId, userId);
  const totalAllocated = await getGoalAllocationsTotal(goalId, userId);
  
  const progress = goal.valor_objetivo > 0 ? (totalAllocated / goal.valor_objetivo) * 100 : 0;
  
  return {
    goal,
    totalAllocated,
    progress: Math.min(progress, 100),
    remaining: Math.max(goal.valor_objetivo - totalAllocated, 0)
  };
};

// Função para verificar se um objetivo está completo (100% ou mais)
const isGoalComplete = (valorAtual: number, valorObjetivo: number) => {
  return (valorAtual / valorObjetivo) >= 1;
};

// Função para criar notificação de sucesso quando objetivo é atingido
const createGoalSuccessNotification = async (goal: any, userId: string) => {
  try {
    const { createNotification } = await import('./notifications');
    
    await createNotification({
      user_id: userId,
      title: `Objetivo "${goal.nome}" Atingido!`,
      type: 'success',
      message: `🎉 Objetivo "${goal.nome}" atingido com sucesso! Parabéns!`,
      read: false
    });
    
    console.log('✅ Notificação de sucesso criada para objetivo:', goal.nome);
  } catch (error) {
    console.warn('⚠️ Erro ao criar notificação de sucesso (não crítico):', error);
  }
};

// Função para verificar e criar notificação se objetivo foi atingido
const checkAndNotifyGoalCompletion = async (goalId: string, userId: string) => {
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (goal && isGoalComplete(goal.valor_atual, goal.valor_objetivo)) {
    await createGoalSuccessNotification(goal, userId);
  }
};