import { useState, useEffect, useCallback } from 'react';
import * as svc from '../services/transactions';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filters, setFilters] = useState({ account_id: '', categoria_id: '', dataInicio: '', dataFim: '' });

  const fetch = useCallback(async () => {
    let query = svc.getTransactions();
    // Filtros locais após fetch (poderia ser query Supabase se necessário)
    const { data } = await query;
    let filtered = data || [];
    // Só aplicar filtro de conta se houver contas disponíveis e filtro definido
    if (filters.account_id && filtered.some((t: any) => t.account_id === filters.account_id)) {
      filtered = filtered.filter((t: any) => t.account_id === filters.account_id);
    }
    if (filters.categoria_id) filtered = filtered.filter((t: any) => t.categoria_id === filters.categoria_id);
    if (filters.dataInicio) filtered = filtered.filter((t: any) => t.data >= filters.dataInicio);
    if (filters.dataFim) filtered = filtered.filter((t: any) => t.data <= filters.dataFim);
    setTransactions(filtered);
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (payload: Parameters<typeof svc.createTransaction>[0]) => {
    const res = await svc.createTransaction(payload);
    if (!res.error) fetch();
    return res;
  };

  const update = async (id: string, data: any) => {
    const res = await svc.updateTransaction(id, data);
    if (!res.error) fetch();
    return res;
  };

  const remove = async (id: string) => {
    const res = await svc.deleteTransaction(id);
    if (!res.error) fetch();
    return res;
  };

  return {
    transactions,
    create,
    update,
    remove,
    filters,
    setFilters,
    refetch: fetch,
  };
}; 