import { useState, useEffect, useCallback } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories';

export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
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

  const create = async (payload: { nome: string; tipo: string; cor?: string }, userId: string) => {
    const { data, error } = await createCategory(payload, userId);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  const update = async (id: string, data: any, userId: string) => {
    const { data: result, error } = await updateCategory(id, data, userId);
    if (!error && result) {
      await fetch();
    }
    return { data: result, error };
  };

  const remove = async (id: string, userId: string) => {
    const { data, error } = await deleteCategory(id, userId);
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