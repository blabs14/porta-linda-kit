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
import { supabase } from '../lib/supabaseClient';

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
    queryKey: ['accountsWithBalances', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccountsWithBalances(user?.id);
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
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] });
      }
    }
  );
};

export const useCreditCardSummary = (accountId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creditCardSummary', accountId, user?.id],
    queryFn: async () => {
      if (!user?.id || !accountId) return null;
      
      const { data, error } = await supabase.rpc('get_credit_card_summary', {
        p_user_id: user.id,
        p_account_id: accountId
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!accountId,
    staleTime: 0, // Sempre considerar stale para forçar refetch
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
  });
};

 