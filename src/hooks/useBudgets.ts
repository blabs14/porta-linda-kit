import { useState, useEffect, useCallback } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgets';
import type { Budget, BudgetInsert, BudgetUpdate } from '../integrations/supabase/types';

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getBudgets();
    if (!error && data) {
      setBudgets(data);
      setError(null);
    } else {
      setBudgets([]);
      setError(error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (payload: BudgetInsert, userId: string) => {
    const res = await createBudget(payload, userId);
    if (!res.error) fetch();
    return res;
  };

  const update = async (id: string, data: BudgetUpdate, userId: string) => {
    const res = await updateBudget(id, data, userId);
    if (!res.error) fetch();
    return res;
  };

  const remove = async (id: string, userId: string) => {
    const res = await deleteBudget(id, userId);
    if (!res.error) fetch();
    return res;
  };

  return {
    budgets,
    loading,
    error,
    create,
    update,
    remove,
    refetch: fetch,
  };
};