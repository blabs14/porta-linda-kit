import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories, getCategoriesDomain, createCategory, updateCategory, deleteCategory } from '../services/categories';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryDomain } from '../shared/types/categories';
import type { Category, CategoryInsert, CategoryUpdate } from '../integrations/supabase/types';
import { showError } from '../lib/utils';

export const useCategories = (tipo?: string) => {
  const { user } = useAuth();
  
  return useQuery<CategoryDomain[]>({
    queryKey: ['categories', user?.id, tipo],
    queryFn: async () => {
      // Trazer categorias default (user_id null) + do utilizador
      const { data, error } = await (async ()=>{
        const d1 = await getCategories(undefined, undefined); // defaults
        const d2 = await getCategories(user?.id || '', undefined);
        return { data: [ ...(d1.data||[]), ...(d2.data||[]) ] as any[], error: (d1.error||d2.error) };
      })();
      if (error) throw error as any;
      // map para domínio
      const merged = (data || []) as any[];
      // ordenar por nome
      merged.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||'')));
      return merged as any;
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
      try {
        // defaults + user
        const d1 = await getCategories(undefined, undefined);
        const d2 = await getCategories(user?.id || '', undefined);
        
        // Verificar se houve erros nas queries
        if (d1.error && d2.error) {
          throw d1.error || d2.error;
        }
        
        const all = [ ...(d1.data||[]), ...(d2.data||[]) ];
        return all.map((row: any) => ({ id: row.id, nome: row.nome, cor: row.cor }));
      } catch (err: any) {
        console.error('Failed to fetch categories domain', err);
        showError(err?.message || 'Falha ao obter categorias');
        return [] as CategoryDomain[];
      }
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
      const body = { ...payload, user_id: payload.user_id || user?.id } as CategoryInsert;
      const { data, error } = await createCategory(body);
      if (error) throw error as any;
      return data as Category;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-domain'] });
      onSuccess?.(data as Category);
    },
    onError: (err: any) => {
      // Se for violação de unique (409) devolve mensagem clara
      if (err?.code === '23505' || String(err?.message||'').toLowerCase().includes('duplicate')) {
        throw new Error('Já existe uma categoria com esse nome (ignora maiúsculas/minúsculas/acentos).');
      }
      throw err;
    }
  });
};

export const useUpdateCategory = (onSuccess?: (updated: Category) => void) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryUpdate }) => {
      const { data: result, error } = await updateCategory(id, data);
      if (error) throw error as any;
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
      if (error) throw error as any;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-domain'] });
      onSuccess?.();
    },
  });
};