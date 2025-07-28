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
import { useAuth } from '../contexts/AuthContext';

export const useGoalAllocations = (goalId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: allocations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: goalId ? ['goalAllocations', goalId] : ['goalAllocations'],
    queryFn: () => goalId 
      ? getGoalAllocations(goalId, user?.id || '')
      : getAllGoalAllocations(user?.id || ''),
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

  const updateAllocationMutation = useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { valor?: number; data_alocacao?: string; descricao?: string };
    }) => updateGoalAllocation(id, data, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: (id: string) => deleteGoalAllocation(id, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const getTotalAllocated = async (goalId: string) => {
    return await getGoalAllocationsTotal(goalId, user?.id || '');
  };

  const getAccountTotalAllocated = async (accountId: string) => {
    return await getAccountAllocationsTotal(accountId, user?.id || '');
  };

  return {
    allocations,
    isLoading,
    error,
    refetch,
    createAllocation: createAllocationMutation.mutateAsync,
    updateAllocation: updateAllocationMutation.mutateAsync,
    deleteAllocation: deleteAllocationMutation.mutateAsync,
    getTotalAllocated,
    getAccountTotalAllocated,
    isCreating: createAllocationMutation.isPending,
    isUpdating: updateAllocationMutation.isPending,
    isDeleting: deleteAllocationMutation.isPending
  };
}; 