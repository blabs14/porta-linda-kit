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
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccounts(user?.id as any);
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
    async (data: any) => {
      const payload = { user_id: user?.id, ...data };
      const { data: created, error } = await createAccount(payload as any);
      if (error) {
        throw error as any;
      }
      return created as any;
    },
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
    async (variables: any) => {
      const { id, ...updateData } = variables || {};
      const { data: updated, error } = await updateAccount(id as string, updateData as any);
      if (error) {
        throw error as any;
      }
      return updated as any;
    },
    {
      operation: 'update',
      entityName: 'Conta',
      onSuccess: async () => {
        console.log('[useUpdateAccount] Invalidating queries...');
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['creditCardSummary'] })
        ]);
        
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['accountsWithBalances', user?.id] }),
          queryClient.refetchQueries({ queryKey: ['creditCardSummary'] })
        ]);
        
        console.log('[useUpdateAccount] Queries invalidated and refetched');
      }
    }
  );
};

export const useDeleteAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (id: string) => {
      const { data, error } = await deleteAccount(id as any);
      if (error) {
        throw error as any;
      }
      return data as any;
    },
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

// TODO: Descomentar quando a função RPC get_credit_card_summary for implementada
// export const useCreditCardSummary = (accountId: string) => {
//   const { user } = useAuth();
//   
//   return useQuery({
//     queryKey: ['creditCardSummary', accountId, user?.id],
//     queryFn: async () => {
//       if (!user?.id || !accountId) return null;
//       
//       const { data, error } = await supabase.rpc('get_credit_card_summary', {
//         p_user_id: user.id,
//         p_account_id: accountId
//       });
//       
//       if (error) throw error;
//       return data;
//     },
//     enabled: !!user?.id && !!accountId,
//     staleTime: 0, // Sempre considerar stale para forçar refetch
//     gcTime: 5 * 60 * 1000, // 5 minutos de cache,
//   });
// };

 