import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, createGoal, updateGoal, deleteGoal, allocateToGoal, getGoalProgress } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: goals = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['goals'],
    queryFn: () => getGoals(user?.id || ''),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0, // Dados sempre considerados stale para forçar refetch
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: { nome: string; valor_objetivo: number; prazo: string; account_id?: string; family_id?: string }) => 
      createGoal(data, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      updateGoal(id, data, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const allocateToGoalMutation = useMutation({
    mutationFn: ({ goalId, accountId, amount, description }: {
      goalId: string;
      accountId: string;
      amount: number;
      description?: string;
    }) => {
      return allocateToGoal(goalId, accountId, amount, user?.id || '', description);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('❌ allocateToGoalMutation: onError:', error);
    }
  });

  const getGoalProgressData = async (goalId: string) => {
    return await getGoalProgress(goalId, user?.id || '');
  };

  return {
    goals,
    isLoading,
    error,
    refetch,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    allocateToGoal: allocateToGoalMutation.mutateAsync,
    getGoalProgress: getGoalProgressData,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isAllocating: allocateToGoalMutation.isPending
  };
}; 