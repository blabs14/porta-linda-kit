import { supabase } from '../lib/supabaseClient';
import { logger } from '@/shared/lib/logger';

export interface NotificationData {
  goalName?: string;
  goalAmount?: number;
  currentAmount?: number;
  categoryName?: string;
  spent?: number;
  budget?: number;
  description?: string;
  amount?: number;
  income?: number;
  expenses?: number;
  month?: string;
  inviterName?: string;
  familyName?: string;
  memberName?: string;
}

export type NotificationType = 
  | 'goal_achieved'
  | 'goal_progress'
  | 'budget_alert'
  | 'budget_exceeded'
  | 'large_transaction'
  | 'monthly_summary'
  | 'family_invite'
  | 'family_joined';

/**
 * Envia notificação usando a Edge Function
 */
export const sendNotification = async (
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('notification-triggers', {
      body: { type, userId, data }
    });

    if (error) {
      logger.error('Erro ao enviar notificação:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Erro ao enviar notificação:', error);
    return { success: false, error: 'Erro de comunicação' };
  }
};

/**
 * Verifica se uma meta foi atingida e envia notificação
 */
export const checkGoalAchievement = async (
  userId: string,
  goalId: string,
  currentAmount: number,
  goalAmount: number,
  goalName: string
): Promise<void> => {
  if (currentAmount >= goalAmount) {
    await sendNotification(userId, 'goal_achieved', {
      goalName,
      goalAmount,
      currentAmount,
    });
  } else if (currentAmount >= goalAmount * 0.8) {
    // Notificar quando 80% da meta for atingida
    await sendNotification(userId, 'goal_progress', {
      goalName,
      goalAmount,
      currentAmount,
    });
  }
};

/**
 * Verifica alertas de orçamento e envia notificações
 */
export const checkBudgetAlerts = async (
  userId: string,
  categoryId: string,
  categoryName: string,
  spent: number,
  budget: number
): Promise<void> => {
  const percentage = (spent / budget) * 100;

  if (percentage > 100) {
    // Orçamento excedido
    await sendNotification(userId, 'budget_exceeded', {
      categoryName,
      spent,
      budget,
    });
  } else if (percentage > 80) {
    // Alerta de orçamento (80% ou mais)
    await sendNotification(userId, 'budget_alert', {
      categoryName,
      spent,
      budget,
    });
  }
};

/**
 * Verifica transações grandes e envia notificação
 */
export const checkLargeTransaction = async (
  userId: string,
  amount: number,
  description: string,
  threshold: number = 1000
): Promise<void> => {
  if (Math.abs(amount) >= threshold) {
    await sendNotification(userId, 'large_transaction', {
      description,
      amount,
    });
  }
};

/**
 * Envia resumo mensal
 */
export const sendMonthlySummary = async (
  userId: string,
  month: string,
  income: number,
  expenses: number
): Promise<void> => {
  await sendNotification(userId, 'monthly_summary', {
    month,
    income,
    expenses,
  });
};

/**
 * Envia notificação de convite familiar
 */
export const sendFamilyInvite = async (
  userId: string,
  inviterName: string,
  familyName: string
): Promise<void> => {
  await sendNotification(userId, 'family_invite', {
    inviterName,
    familyName,
  });
};

/**
 * Envia notificação de novo membro da família
 */
export const sendFamilyJoined = async (
  userId: string,
  memberName: string
): Promise<void> => {
  await sendNotification(userId, 'family_joined', {
    memberName,
  });
};