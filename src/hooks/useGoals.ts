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
    const res = await createGoal(payload, userId);
    if (!res.error) fetch();
    return res;
  };

  const update = async (id: string, data: any, userId: string) => {
    const res = await updateGoal(id, data, userId);
    if (!res.error) fetch();
    return res;
  };

  const remove = async (id: string, userId: string) => {
    const res = await deleteGoal(id, userId);
    if (!res.error) fetch();
    return res;
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