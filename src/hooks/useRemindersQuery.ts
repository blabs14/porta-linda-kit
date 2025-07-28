import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../services/reminders';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useReminders = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await getReminders();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: createReminder,
    operation: 'create',
    entityName: 'Lembrete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: updateReminder,
    operation: 'update',
    entityName: 'Lembrete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: deleteReminder,
    operation: 'delete',
    entityName: 'Lembrete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}; 