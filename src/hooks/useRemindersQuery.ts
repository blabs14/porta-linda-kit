import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReminders, createReminder, updateReminder, deleteReminder, NewReminderFormPayload, LegacyReminderPayload } from '../services/reminders';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';
import { logger } from '@/shared/lib/logger';

// Tipo para Reminder da base de dados
export interface Reminder {
  id: string;
  user_id: string;
  family_id: string | null;
  title: string;
  description: string | null;
  date: string;
  recurring: boolean | null;
  created_at: string;
}

export const useReminders = () => {
  const { user } = useAuth();
  
  return useQuery<Reminder[]>({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await getReminders(user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useCrudMutation(
    async (payload: NewReminderFormPayload | LegacyReminderPayload) => {
      const { data, error } = await createReminder({ ...payload, user_id: user?.id || '' });
      if (error) throw error;
      return data;
    },
    {
      operation: 'create',
      entityName: 'Lembrete',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
      },
    }
  );
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useCrudMutation(
    async (variables: { id: string; data: Partial<NewReminderFormPayload | LegacyReminderPayload> }) => {
      const { id, data } = variables;
      const { data: result, error } = await updateReminder(id, data);
      if (error) throw error;
      return result;
    },
    {
      operation: 'update',
      entityName: 'Lembrete',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
      },
    }
  );
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useCrudMutation(
    async (id: string) => {
      const { data, error } = await deleteReminder(id);
      if (error) throw error as any;
      return data as any;
    },
    {
      operation: 'delete',
      entityName: 'Lembrete',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
      },
    }
  );
};

// Versão com confirmação explícita (opcional no UI)
export const useDeleteReminderWithConfirm = () => {
  const deleteMutation = useDeleteReminder();
  return async (id: string) => {
    if (process.env.NODE_ENV !== 'test') {
      const proceed = window.confirm('Tem a certeza que deseja eliminar este lembrete? Esta ação não pode ser desfeita.');
      if (!proceed) return;
    }
    await deleteMutation.mutateAsync(id);
  };
};