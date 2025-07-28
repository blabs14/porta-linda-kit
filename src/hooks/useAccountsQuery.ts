import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountsWithBalances 
} from '../services/accounts';
import { AccountWithBalances } from '../integrations/supabase/types';
import { useCrudMutation } from './useMutationWithFeedback';

export const useAccounts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await getAccounts();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};

export const useAccountsWithBalances = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['accountsWithBalances'],
    queryFn: async () => {
      const { data, error } = await getAccountsWithBalances();
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

export const useCreateAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    (data: { nome: string; tipo: string; saldo?: number }) => 
      createAccount({ ...data, user_id: user?.id || '' }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Conta',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      }
    }
  );
};

export const useUpdateAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    ({ id, data }: { id: string; data: { nome?: string; tipo?: string; saldo?: number } }) => 
      updateAccount(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Conta',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      }
    }
  );
};

export const useDeleteAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    (id: string) => deleteAccount(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Conta',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
      }
    }
  );
};

 