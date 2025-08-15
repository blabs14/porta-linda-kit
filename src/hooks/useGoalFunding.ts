import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  listFundingRules,
  createFundingRule,
  updateFundingRule,
  deleteFundingRule,
  listGoalContributions,
  GoalFundingRuleInsert,
  GoalFundingRuleUpdate
} from '../services/goalFunding';

export const useGoalFunding = (goalId: string | null | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: ['goalFundingRules', user?.id, goalId || 'none'],
    queryFn: async () => {
      if (!goalId) return [] as any[];
      const { data, error } = await listFundingRules(goalId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!goalId
  });

  const contributions = useQuery({
    queryKey: ['goalContributions', user?.id, goalId || 'none'],
    queryFn: async () => {
      if (!goalId) return [] as any[];
      const { data, error } = await listGoalContributions(goalId, 20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!goalId
  });

  const createRule = useMutation({
    mutationFn: (payload: GoalFundingRuleInsert) => createFundingRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalFundingRules'] });
    }
  });

  const updateRule = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: GoalFundingRuleUpdate }) => updateFundingRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalFundingRules'] });
    }
  });

  const removeRule = useMutation({
    mutationFn: (id: string) => deleteFundingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalFundingRules'] });
    }
  });

  return {
    rules,
    contributions,
    createRule,
    updateRule,
    removeRule
  } as const;
}; 