import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, getGoalsDomain, createGoal, updateGoal, deleteGoal, allocateFunds, getGoalProgress } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';
import type { GoalInsert, GoalUpdate } from '../integrations/supabase/types';
import type { GoalDomain } from '../shared/types/goals';
import { logger } from '@/shared/lib/logger';

export const useGoals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
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
};

export const useGoalsDomain = () => {
  const { user } = useAuth();
  return useQuery<GoalDomain[]>({
    queryKey: ['goals-domain', user?.id],
    queryFn: async () => {
      const { data, error } = await getGoalsDomain(user?.id || '');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GoalInsert) => {
      const result = await createGoal(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-domain'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: { id: string; data?: GoalUpdate } & Partial<GoalUpdate>
    ) => {
      const { id, data, ...maybeFields } = variables;
      const updateData: GoalUpdate = data ?? (maybeFields as GoalUpdate);
      const result = await updateGoal(id, updateData);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-domain'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    }
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteGoal(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-domain'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    }
  });
};

export const useAllocateFunds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const result = await allocateFunds(goalId, amount);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-domain'] });
      queryClient.invalidateQueries({ queryKey: ['goalProgress'] });
    }
  });
};

export const useGoalProgress = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goalProgress', user?.id],
    queryFn: async () => {
      const { data, error } = await getGoalProgress();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};