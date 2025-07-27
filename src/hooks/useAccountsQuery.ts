import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts';
import { useAuth } from '../contexts/AuthContext';

export const useAccounts = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await getAccounts();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: { nome: string; tipo: string }) => {
      const { data, error } = await createAccount(payload, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateAccount(id, data, user?.id || '');
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteAccount(id, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

 