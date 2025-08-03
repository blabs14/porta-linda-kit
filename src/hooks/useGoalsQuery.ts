import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, createGoal, updateGoal, deleteGoal, allocateToGoal, getGoalProgress } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';
import { GoalProgress } from '../integrations/supabase/types';

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  console.log('[useGoals] Hook called with user:', user?.id);

  const {
    data: goalsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      console.log('[useGoals] Query function called');
      const { data, error } = await getGoals(user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: { nome: string; valor_objetivo: number; prazo?: string; account_id?: string; family_id?: string; valor_atual?: number; ativa?: boolean }) => {
      console.log('[createGoalMutation] Mutation function called with data:', data);
      const result = await createGoal({ ...data, user_id: user?.id || '' }, user?.id || '');
      console.log('[createGoalMutation] createGoal result:', result);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      console.log('[createGoalMutation] onSuccess called with data:', data);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    },
    onError: (error) => {
      console.error('[createGoalMutation] onError called with error:', error);
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await updateGoal(id, data, user?.id || '');
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteGoal(id, user?.id || '');
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    }
  });

  const allocateToGoalMutation = useMutation({
    mutationFn: ({ goalId, accountId, amount, description }: {
      goalId: string;
      accountId: string;
      amount: number;
      description?: string;
    }) => {
      console.log('[allocateToGoalMutation] Mutation function called with:', { goalId, accountId, amount, description });
      return allocateToGoal(goalId, accountId, amount, user?.id || '', description);
    },
    onSuccess: (data) => {
      console.log('[allocateToGoalMutation] onSuccess called with data:', data);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['personal', 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['personal', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['personal', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
      queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      queryClient.invalidateQueries({ queryKey: ['personal', 'kpis'] });
    },
    onError: (error) => {
      console.error('[allocateToGoalMutation] onError called with error:', error);
    }
  });

  return {
    goals: goalsData || [],
    isLoading,
    error,
    refetch,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    allocateToGoal: allocateToGoalMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isAllocating: allocateToGoalMutation.isPending
  };
};

export const useGoalProgress = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goalProgress'],
    queryFn: async () => {
      const { data, error } = await getGoalProgress();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
}; 