import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../services/profiles';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';
import type { Profile, ProfileUpdate } from '../integrations/supabase/types';

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await getProfile(user?.id || '');
      if (error) throw error;
      return (data as Profile) || null;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useCrudMutation(
    async ({ id, data }: { id: string; data: ProfileUpdate }) => {
      const { data: result, error } = await updateProfile(id, data);
      if (error) throw error;
      return result as Profile | null;
    },
    {
      operation: 'update',
      entityName: 'Perfil',
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['profile', id] });
      },
    }
  );
}; 