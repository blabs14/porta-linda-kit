import { useState, useEffect, useCallback } from 'react';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/goals';

export const useGoals = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getGoals();
    if (!error && data) {
      setGoals(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (payload: any, userId: string) => {
    const { data, error } = await createGoal(payload, userId);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  const update = async (id: string, data: any, userId: string) => {
    const { data: result, error } = await updateGoal(id, data, userId);
    if (!error && result) {
      await fetch();
    }
    return { data: result, error };
  };

  const remove = async (id: string, userId: string) => {
    const { data, error } = await deleteGoal(id, userId);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  return {
    goals,
    loading,
    create,
    update,
    remove,
    refetch: fetch,
  };
};