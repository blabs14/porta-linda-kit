import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import * as familyService from '../services/family';

// ============================================================================
// FAMILY DATA HOOKS
// ============================================================================

export const useFamilyData = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['family-data'],
    queryFn: familyService.getFamilyData,
    enabled: !!user,
  });
};

export const useFamilyMembers = (familyId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['family-members', familyId],
    queryFn: () => familyService.getFamilyMembers(familyId),
    enabled: !!user,
  });
};

export const usePendingInvites = (familyId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pending-invites', familyId],
    queryFn: () => familyService.getPendingInvites(familyId),
    enabled: !!user,
  });
};

// ============================================================================
// FAMILY MANAGEMENT MUTATIONS
// ============================================================================

export const useCreateFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ familyName, description }: { familyName: string; description?: string }) =>
      familyService.createFamily(familyName, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-data'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Família criada',
        description: 'Família criada com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar família',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateFamilySettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ familyId, settings }: { familyId: string; settings: Record<string, unknown> }) =>
      familyService.updateFamilySettings(familyId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-data'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'Configurações da família atualizadas com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// FAMILY MEMBERS MANAGEMENT MUTATIONS
// ============================================================================

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ familyId, userId, newRole }: { familyId: string; userId: string; newRole: string }) =>
      familyService.updateMemberRole(familyId, userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Role atualizado',
        description: 'Role do membro atualizado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar role',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveFamilyMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ familyId, userId }: { familyId: string; userId: string }) =>
      familyService.removeFamilyMember(familyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Membro removido',
        description: 'Membro removido da família com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover membro',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// FAMILY INVITES MANAGEMENT MUTATIONS
// ============================================================================

export const useInviteFamilyMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ familyId, email, role }: { familyId: string; email: string; role: string }) =>
      familyService.inviteFamilyMember(familyId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite enviado',
        description: 'Convite enviado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar convite',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelFamilyInvite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (inviteId: string) => familyService.cancelFamilyInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite cancelado',
        description: 'Convite cancelado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cancelar convite',
        variant: 'destructive',
      });
    },
  });
};

export const useAcceptFamilyInvite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (inviteId: string) => familyService.acceptFamilyInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-data'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite aceite',
        description: 'Convite aceite com sucesso! Bem-vindo à família!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao aceitar convite',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// FAMILY SHARING MUTATIONS
// ============================================================================

export const useShareGoalWithFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ goalId, familyId }: { goalId: string; familyId: string }) =>
      familyService.shareGoalWithFamily(goalId, familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo partilhado',
        description: 'Objetivo partilhado com a família com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao partilhar objetivo',
        variant: 'destructive',
      });
    },
  });
};

export const useUnshareGoalFromFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (goalId: string) => familyService.unshareGoalFromFamily(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Partilha removida',
        description: 'Partilha do objetivo removida com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover partilha',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// FAMILY STATISTICS HOOK
// ============================================================================

export const useFamilyStatistics = (familyId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['family-statistics', familyId],
    queryFn: () => familyService.getFamilyStatistics(familyId),
    enabled: !!user && !!familyId,
  });
}; 