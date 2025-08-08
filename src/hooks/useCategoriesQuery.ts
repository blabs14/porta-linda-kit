import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories';
import { useAuth } from '../contexts/AuthContext';

export const useCategories = (tipo?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['categories', user?.id, tipo],
    queryFn: async () => {
      const { data, error } = await getCategories(user?.id || '', tipo);
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

export const useCreateCategory = (onSuccess?: (created: any) => void) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await createCategory(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSuccess?.(data as any);
    },
  });
};

export const useUpdateCategory = (onSuccess?: (updated: any) => void) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateCategory(id, data);
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSuccess?.(data as any);
    },
  });
};

export const useDeleteCategory = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteCategory(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSuccess?.();
    },
  });
};