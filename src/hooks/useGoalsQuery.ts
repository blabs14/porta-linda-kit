import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';

export const useGoals = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await getGoals();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await createGoal(payload, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateGoal(id, data, user?.id || '');
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteGoal(id, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}; 