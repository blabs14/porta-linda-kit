import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories';
import { useAuth } from '../contexts/AuthContext';

export const useCategories = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await getCategories();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: { nome: string; cor: string }) => {
      console.log('[useCreateCategory] Mutation function called with payload:', payload);
      console.log('[useCreateCategory] user ID:', user?.id);
      
      if (!user?.id) {
        throw new Error('Utilizador não autenticado');
      }
      
      const result = await createCategory(payload, user.id);
      console.log('[useCreateCategory] Service result:', result);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      console.log('[useCreateCategory] onSuccess called with data:', data);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      console.error('[useCreateCategory] onError called with error:', error);
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateCategory(id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteCategory(id, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};