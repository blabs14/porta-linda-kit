import { supabase } from '../lib/supabaseClient';

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
): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('notification-triggers', {
      body: { type, userId, data }
    });

    if (error) {
      console.error('Erro ao enviar notificação:', error);
      return { data: null, error };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return { data: null, error };
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
): Promise<{ data: any | null; error: any }> => {
  try {
    if (currentAmount >= goalAmount) {
      const result = await sendNotification(userId, 'goal_achieved', {
        goalName,
        goalAmount,
        currentAmount,
      });
      return result;
    } else if (currentAmount >= goalAmount * 0.8) {
      // Notificar quando 80% da meta for atingida
      const result = await sendNotification(userId, 'goal_progress', {
        goalName,
        goalAmount,
        currentAmount,
      });
      return result;
    }
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
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
): Promise<{ data: any | null; error: any }> => {
  try {
    const percentage = (spent / budget) * 100;

    if (percentage > 100) {
      // Orçamento excedido
      const result = await sendNotification(userId, 'budget_exceeded', {
        categoryName,
        spent,
        budget,
      });
      return result;
    } else if (percentage > 80) {
      // Alerta de orçamento (80% ou mais)
      const result = await sendNotification(userId, 'budget_alert', {
        categoryName,
        spent,
        budget,
      });
      return result;
    }
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
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
): Promise<{ data: any | null; error: any }> => {
  try {
    if (Math.abs(amount) >= threshold) {
      const result = await sendNotification(userId, 'large_transaction', {
        description,
        amount,
      });
      return result;
    }
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
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
): Promise<{ data: any | null; error: any }> => {
  try {
    const result = await sendNotification(userId, 'monthly_summary', {
      month,
      income,
      expenses,
    });
    return result;
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Envia notificação de convite familiar
 */
export const sendFamilyInvite = async (
  userId: string,
  inviterName: string,
  familyName: string
): Promise<{ data: any | null; error: any }> => {
  try {
    const result = await sendNotification(userId, 'family_invite', {
      inviterName,
      familyName,
    });
    return result;
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Envia notificação de novo membro da família
 */
export const sendFamilyJoined = async (
  userId: string,
  memberName: string
): Promise<{ data: any | null; error: any }> => {
  try {
    const result = await sendNotification(userId, 'family_joined', {
    memberName,
  });
    return result;
  } catch (error) {
    return { data: null, error };
  }
}; 