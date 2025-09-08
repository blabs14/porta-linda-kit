import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getCategories } from '../services/categories';
import { getAccountsWithBalances } from '../services/accounts';

export const useReferenceData = () => {
  const { user } = useAuth();

  const categories = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await getCategories();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const accounts = useQuery({
    queryKey: ['accountsWithBalances', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccountsWithBalances(user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });



  return {
    categories,
    accounts,
  };
};