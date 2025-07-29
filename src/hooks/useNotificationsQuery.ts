import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, createNotification, markNotificationRead, deleteNotification } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';

export const useNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await getNotifications(user?.id || '');
      if (error) {
        console.error('[useNotifications] Error:', error);
        throw new Error(error.message || 'Erro ao buscar notificações');
      }
      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation(
    (data: { user_id: string; family_id?: string; title: string; type: string; message: string; read?: boolean }) => 
      createNotification(data),
    {
      operation: 'create',
      entityName: 'Notificação',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    }
  );
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation(
    (id: string) => markNotificationRead(id),
    {
      operation: 'update',
      entityName: 'Notificação',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    }
  );
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation(
    (id: string) => deleteNotification(id),
    {
      operation: 'delete',
      entityName: 'Notificação',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    }
  );
}; 