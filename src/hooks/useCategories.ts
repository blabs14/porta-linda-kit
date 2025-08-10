import { useState, useEffect, useCallback } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories';
import type { Category, CategoryInsert, CategoryUpdate } from '../integrations/supabase/types';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getCategories();
    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (payload: CategoryInsert) => {
    const { data, error } = await createCategory(payload);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  const update = async (id: string, data: CategoryUpdate) => {
    const { data: result, error } = await updateCategory(id, data);
    if (!error && result) {
      await fetch();
    }
    return { data: result, error };
  };

  const remove = async (id: string) => {
    const { data, error } = await deleteCategory(id);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  return {
    categories,
    loading,
    create,
    update,
    remove,
    refetch: fetch,
  };
};