import { useQuery } from '@tanstack/react-query';
import { getFamilyMembers } from '../services/family_members';
import { useAuth } from '../contexts/AuthContext';

export const useFamilyMembers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['family-members'],
    queryFn: async () => {
      const { data, error } = await getFamilyMembers();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}; 