import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories, getCategoriesDomain, createCategory, updateCategory, deleteCategory } from '../services/categories';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryDomain } from '../shared/types/categories';
import type { Category, CategoryInsert, CategoryUpdate } from '../integrations/supabase/types';

export const useCategories = (tipo?: string) => {
  const { user } = useAuth();
  
  return useQuery<Category[]>({
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

export const useCategoriesDomain = (tipo?: string) => {
  const { user } = useAuth();
  return useQuery<CategoryDomain[]>({
    queryKey: ['categories-domain', user?.id, tipo],
    queryFn: async () => {
      const { data, error } = await getCategoriesDomain(user?.id || '', tipo);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateCategory = (onSuccess?: (created: Category) => void) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: CategoryInsert) => {
      const { data, error } = await createCategory(payload);
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-domain'] });
      onSuccess?.(data as Category);
    },
  });
};

export const useUpdateCategory = (onSuccess?: (updated: Category) => void) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryUpdate }) => {
      const { data: result, error } = await updateCategory(id, data);
      if (error) throw error;
      return result as Category;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-domain'] });
      onSuccess?.(data as Category);
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
      queryClient.invalidateQueries({ queryKey: ['categories-domain'] });
      onSuccess?.();
    },
  });
};