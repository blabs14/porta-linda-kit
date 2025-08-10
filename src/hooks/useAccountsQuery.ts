import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAccounts, 
  getAccountsDomain,
  createAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountsWithBalances, 
  getAccountsWithBalancesDomain
} from '../services/accounts';
import { getCreditCardSummary } from '../services/transactions';
import { AccountInsert, AccountUpdateExtended, AccountWithBalances } from '../integrations/supabase/types';
import { useCrudMutation } from './useMutationWithFeedback';

export const useAccounts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccounts(user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};

export const useAccountsDomain = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts-domain', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccountsDomain(user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};

export const useAccountsWithBalances = () => {
  const { user } = useAuth();
  
  return useQuery<AccountWithBalances[] | []>({
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

export const useAccountsWithBalancesDomain = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['accountsWithBalances-domain', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccountsWithBalancesDomain(user?.id);
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
    async (data: AccountInsert) => {
      const payload: AccountInsert = { ...data, user_id: data.user_id ?? (user?.id || '') } as AccountInsert;
      const { data: created, error } = await createAccount(payload);
      if (error) throw error;
      return created;
    },
    {
      operation: 'create',
      entityName: 'Conta',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['accounts-domain'] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances-domain', user?.id] });
      }
    }
  );
};

export const useUpdateAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (variables: { id: string } & AccountUpdateExtended) => {
      const { id, ...updateData } = variables;
      const { data: updated, error } = await updateAccount(id, updateData as AccountUpdateExtended);
      if (error) throw error;
      return updated;
    },
    {
      operation: 'update',
      entityName: 'Conta',
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['accounts'] }),
          queryClient.invalidateQueries({ queryKey: ['accounts-domain'] }),
          queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['accountsWithBalances-domain', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['creditCardSummary'] })
        ]);

        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['accountsWithBalances', user?.id] }),
          queryClient.refetchQueries({ queryKey: ['accountsWithBalances-domain', user?.id] }),
          queryClient.refetchQueries({ queryKey: ['creditCardSummary'] })
        ]);
      }
    }
  );
};

export const useDeleteAccount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCrudMutation(
    async (id: string) => {
      const { data, error } = await deleteAccount(id);
      if (error) throw error;
      return data;
    },
    {
      operation: 'delete',
      entityName: 'Conta',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['accounts-domain'] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['accountsWithBalances-domain', user?.id] });
      }
    }
  );
};

export const useCreditCardSummary = (accountId: string) => {
  const { user } = useAuth();
  
  return useQuery<{ saldo: number; total_gastos: number; total_pagamentos: number; status: string; ciclo_inicio: string } | null>({
    queryKey: ['creditCardSummary', accountId, user?.id],
    queryFn: async () => {
      if (!user?.id || !accountId) return null;
      const { data, error } = await getCreditCardSummary(accountId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!accountId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

 