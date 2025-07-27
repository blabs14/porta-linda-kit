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
    const res = await createCategory(payload, userId);
    if (!res.error) fetch();
    return res;
  };

  const update = async (id: string, data: any, userId: string) => {
    const res = await updateCategory(id, data, userId);
    if (!res.error) fetch();
    return res;
  };

  const remove = async (id: string, userId: string) => {
    const res = await deleteCategory(id, userId);
    if (!res.error) fetch();
    return res;
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