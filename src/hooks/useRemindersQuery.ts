import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../services/reminders';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useReminders = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await getReminders(user?.id || '');
      if (error) throw error as any;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useCrudMutation(
    async (payload: Omit<Parameters<typeof createReminder>[0], 'user_id'>) => {
      const { data, error } = await createReminder({ ...(payload as any), user_id: user?.id || '' });
      if (error) throw error as any;
      return data as any;
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
    async (variables: { id: string; data: Parameters<typeof updateReminder>[1] }) => {
      const { id, data } = variables;
      const { data: result, error } = await updateReminder(id, data);
      if (error) throw error as any;
      return result as any;
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