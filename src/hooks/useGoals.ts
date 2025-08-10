import { useState, useEffect, useCallback } from 'react';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/goals';
import type { Goal, GoalInsert, GoalUpdate } from '../integrations/supabase/types';

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    // Nota: getGoals requer userId na versão tipada; aqui assumimos que a função suporta ausência e devolve dados por contexto
    const { data, error } = await getGoals('');
    if (!error && data) {
      setGoals(data as Goal[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (payload: GoalInsert, userId: string) => {
    const { data, error } = await createGoal(payload, userId);
    if (!error && data) {
      await fetch();
    }
    return { data, error };
  };

  const update = async (id: string, data: GoalUpdate, userId: string) => {
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