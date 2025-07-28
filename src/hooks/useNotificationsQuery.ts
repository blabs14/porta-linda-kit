import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, createNotification, updateNotification, deleteNotification } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await getNotifications();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: createNotification,
    operation: 'create',
    entityName: 'Notificação',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useUpdateNotification = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: updateNotification,
    operation: 'update',
    entityName: 'Notificação',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation({
    mutationFn: deleteNotification,
    operation: 'delete',
    entityName: 'Notificação',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}; 