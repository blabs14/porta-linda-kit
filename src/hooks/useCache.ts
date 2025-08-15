import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getCategories } from '../services/categories';
import { getAccountsWithBalances } from '../services/accounts';

export const useReferenceData = () => {
  const { user } = useAuth();

  const categories = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      console.log('[useReferenceData] Fetching categories...');
      const { data, error } = await getCategories();
      if (error) throw error;
      console.log('[useReferenceData] Categories result:', data);
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const accounts = useQuery({
    queryKey: ['accountsWithBalances', user?.id],
    queryFn: async () => {
      console.log('[useReferenceData] Fetching accounts...');
      const { data, error } = await getAccountsWithBalances(user?.id || '');
      if (error) throw error;
      console.log('[useReferenceData] Accounts result:', data);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  console.log('[useReferenceData] Hook state:', {
    user: user?.id,
    categoriesLoading: categories.isLoading,
    categoriesData: categories.data,
    accountsLoading: accounts.isLoading,
    accountsData: accounts.data
  });

  return {
    categories,
    accounts,
  };
}; 