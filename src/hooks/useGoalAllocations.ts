import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getGoalAllocations, 
  getAllGoalAllocations, 
  createGoalAllocation, 
  updateGoalAllocation, 
  deleteGoalAllocation,
  getGoalAllocationsTotal,
  getAccountAllocationsTotal
} from '../services/goalAllocations';
import { allocateToGoal } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';

export const useGoalAllocations = (goalId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: allocationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: goalId ? ['goalAllocations', goalId] : ['goalAllocations'],
    queryFn: async () => {
      const { data, error } = goalId 
        ? await getGoalAllocations(goalId, user?.id || '')
        : await getAllGoalAllocations(user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const createAllocationMutation = useMutation({
    mutationFn: ({ goalId, accountId, amount, description }: {
      goalId: string;
      accountId: string;
      amount: number;
      description?: string;
    }) => createGoalAllocation({
      goal_id: goalId,
      account_id: accountId,
      valor: amount,
      descricao: description
    }, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const allocateToGoalMutation = useMutation({
    mutationFn: ({ goalId, accountId, amount, description }: {
      goalId: string;
      accountId: string;
      amount: number;
      description?: string;
    }) => allocateToGoal(goalId, accountId, amount, user?.id || '', description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountsWithAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const updateAllocationMutation = useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { valor?: number; data_alocacao?: string; descricao?: string };
    }) => updateGoalAllocation(id, data, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountsWithAllocations'] });
    }
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: (id: string) => deleteGoalAllocation(id, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountsWithAllocations'] });
    }
  });

  const getTotalAllocated = async (goalId: string) => {
    return await getGoalAllocationsTotal(goalId, user?.id || '');
  };

  const getAccountTotalAllocated = async (accountId: string) => {
    return await getAccountAllocationsTotal(accountId, user?.id || '');
  };

  return {
    allocations: allocationsData || [],
    isLoading,
    error,
    refetch,
    createAllocation: createAllocationMutation.mutateAsync,
    allocateToGoal: allocateToGoalMutation.mutateAsync,
    updateAllocation: updateAllocationMutation.mutateAsync,
    deleteAllocation: deleteAllocationMutation.mutateAsync,
    getTotalAllocated,
    getAccountTotalAllocated,
    isCreating: createAllocationMutation.isPending,
    isAllocating: allocateToGoalMutation.isPending,
    isUpdating: updateAllocationMutation.isPending,
    isDeleting: deleteAllocationMutation.isPending
  };
}; 