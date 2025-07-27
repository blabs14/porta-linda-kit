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
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string }) => {
      // Converter para o formato esperado pelo serviço
      const servicePayload = {
        nome: payload.nome,
        tipo: 'outro', // Valor padrão
        cor: '#6B7280', // Cor padrão
        descricao: payload.descricao
      };
      const { data, error } = await createCategory(servicePayload, user?.id || '');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await updateCategory(id, data, user?.id || '');
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