import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFamilySettings, updateFamilySettings } from '../services/settings';
import { useAuth } from '../contexts/AuthContext';
import { useCrudMutation } from './useMutationWithFeedback';
import type { FamilySettings } from '../services/settings';

export const useFamilySettings = (familyId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['family-settings', familyId],
    queryFn: async () => {
      const { data, error } = await getFamilySettings(familyId);
      if (error) throw error as Error;
      return data || {};
    },
    enabled: !!user && !!familyId,
  });
};

export const useUpdateFamilySettings = () => {
  const queryClient = useQueryClient();
  
  return useCrudMutation(
    async ({ familyId, settings }: { familyId: string; settings: FamilySettings }) => {
      const { data, error } = await updateFamilySettings(familyId, settings);
      if (error) throw error as Error;
      return data;
    },
    {
      operation: 'update',
      entityName: 'Definições da Família',
      onSuccess: (_, { familyId }) => {
        queryClient.invalidateQueries({ queryKey: ['family-settings', familyId] });
      },
    }
  );
}; 