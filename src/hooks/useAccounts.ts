import { useState, useEffect, useCallback } from 'react';
import { getAccounts, createAccount, updateAccount } from '../services/accounts';
import type { Account, AccountInsert, AccountUpdateExtended } from '../integrations/supabase/types';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAccounts();
    if (!error && data) {
      setAccounts(data);
    } else {
      setAccounts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = async (payload: AccountInsert, userId: string) => {
    const res = await createAccount(payload, userId);
    if (!res.error) fetch();
    return res;
  };

  const update = async (id: string, data: AccountUpdateExtended, userId: string) => {
    const res = await updateAccount(id, data, userId);
    if (!res.error) fetch();
    return res;
  };

  return {
    accounts,
    loading,
    create,
    update,
    refetch: fetch,
  };
};