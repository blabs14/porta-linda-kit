import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getFamilyData, 
  getFamilyMembers, 
  getPendingInvites,
  inviteFamilyMember,
  updateMemberRole,
  removeFamilyMember,
  updateFamilySettings,
  getFamilyKPIs
} from '../../services/family';
import { 
  getAccountsWithBalances,
  createAccount,
  updateAccount,
  deleteAccount
} from '../../services/accounts';
import { 
  getGoals, 
  createGoal, 
  updateGoal, 
  deleteGoal 
} from '../../services/goals';
import { 
  getBudgets, 
  createBudget, 
  updateBudget, 
  deleteBudget 
} from '../../services/budgets';
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../../services/transactions';
import { useCrudMutation } from '../../hooks/useMutationWithFeedback';
import { supabase } from '../../lib/supabaseClient';
import { FamilyContextType, Family, FamilyMember, FamilyInvite, FamilyKPIs, FamilyLoadingStates } from '../../types/family';

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};

interface FamilyProviderProps {
  children: ReactNode;
}

export const FamilyProvider: React.FC<FamilyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query para dados da família atual
  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ['family', 'current', user?.id],
    queryFn: async () => {
      console.log('[FamilyProvider] Getting family data for user:', user?.id);
      
      if (!user?.id) {
        console.log('[FamilyProvider] No user ID, returning null');
        return null;
      }

      try {
        // Tentar primeiro a função RPC
        const data = await getFamilyData();
        console.log('[FamilyProvider] Family data received from RPC:', data);
        
        if (data) {
          return data;
        }
      } catch (error) {
        console.log('[FamilyProvider] RPC failed, trying direct query:', error);
      }

      // Fallback: buscar diretamente da tabela family_members
      try {
        const { data: memberData, error } = await supabase
          .from('family_members')
          .select(`
            *,
            families:family_id (
              id,
              nome,
              description,
              created_by,
              created_at,
              updated_at,
              settings
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('[FamilyProvider] Direct query error:', error);
          return null;
        }

        if (memberData) {
          const result = {
            family: memberData.families,
            user_role: memberData.role,
            member_count: 0, // Será calculado separadamente
            pending_invites_count: 0, // Será calculado separadamente
            shared_goals_count: 0 // Será calculado separadamente
          };
          
          console.log('[FamilyProvider] Family data from direct query:', result);
          return result;
        }
      } catch (error) {
        console.log('[FamilyProvider] Direct query exception:', error);
      }

      return null;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const family = (familyData as any)?.family as Family | null;
  const myRole = (familyData as any)?.user_role as 'owner' | 'admin' | 'member' | 'viewer' | null;

  // Debug log para verificar a estrutura completa
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && familyData) {
      console.log('[FamilyProvider] Full familyData structure:', familyData);
      console.log('[FamilyProvider] family:', family);
      console.log('[FamilyProvider] myRole:', myRole);
      console.log('[FamilyProvider] familyData.family:', (familyData as any)?.family);
      console.log('[FamilyProvider] familyData.user_role:', (familyData as any)?.user_role);
    }
  }, [familyData, family, myRole]);

  // Query para membros da família
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['family', 'members', family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      const data = await getFamilyMembers(family.id);
      return (data || []) as unknown as FamilyMember[];
    },
    enabled: !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Query para convites pendentes
  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['family', 'invites', family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      const data = await getPendingInvites(family.id);
      return (data || []) as unknown as FamilyInvite[];
    },
    enabled: !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Query para contas familiares - usar a função RPC específica para contas familiares
  const { data: allAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['family', 'accounts', user?.id, family?.id],
    queryFn: async () => {
      if (!user?.id || !family?.id) return [];
      
      // Usar a função RPC específica para contas familiares
      const { data, error } = await supabase.rpc('get_family_accounts_with_balances', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar contas familiares
  const familyAccounts = (allAccounts as any[]);
  const familyCards = familyAccounts.filter(account => account.tipo === 'cartão de crédito');
  const regularFamilyAccounts = familyAccounts.filter(account => account.tipo !== 'cartão de crédito');

  // Query para objetivos familiares - usar a função RPC específica para objetivos familiares
  const { data: allGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['family', 'goals', user?.id, family?.id],
    queryFn: async () => {
      if (!user?.id || !family?.id) return [];
      
      // Usar a função RPC específica para objetivos familiares
      const { data, error } = await supabase.rpc('get_family_goals', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar objetivos familiares
  const familyGoals = (allGoals as any[]).map(goal => ({
    ...goal,
    progresso_percentual: goal.valor_atual && goal.valor_objetivo ? 
      Math.min((goal.valor_atual / goal.valor_objetivo) * 100, 100) : 0,
    total_alocado: goal.valor_atual || 0
  }));

  // Query para orçamentos familiares - usar a função RPC específica para orçamentos familiares
  const { data: allBudgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['family', 'budgets', user?.id, family?.id],
    queryFn: async () => {
      if (!user?.id || !family?.id) return [];
      
      // Usar a função RPC específica para orçamentos familiares
      const { data, error } = await supabase.rpc('get_family_budgets', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar orçamentos familiares
  const familyBudgets = (allBudgets as any[]);

  // Query para transações familiares - usar a função RPC específica para transações familiares
  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['family', 'transactions', user?.id, family?.id],
    queryFn: async () => {
      if (!user?.id || !family?.id) return [];
      
      // Usar a função RPC específica para transações familiares
      const { data, error } = await supabase.rpc('get_family_transactions', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar transações familiares
  const familyTransactions = (allTransactions as any[]);

  // Debug logs
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('FamilyProvider Debug:', {
        user: user?.id,
        userEmail: user?.email,
        allGoals: allGoals?.length || 0,
        familyGoals: familyGoals?.length || 0,
        allBudgets: allBudgets?.length || 0,
        familyBudgets: familyBudgets?.length || 0,
        allTransactions: allTransactions?.length || 0,
        familyTransactions: familyTransactions?.length || 0,
        allAccounts: allAccounts?.length || 0,
        familyAccounts: familyAccounts?.length || 0,
        family: family?.id,
        myRole,
        goalsLoading,
        budgetsLoading,
        transactionsLoading,
        accountsLoading
      });
    }
  }, [
    user, 
    allGoals, 
    familyGoals, 
    allBudgets, 
    familyBudgets, 
    allTransactions, 
    familyTransactions, 
    allAccounts, 
    familyAccounts, 
    family, 
    myRole,
    goalsLoading,
    budgetsLoading,
    transactionsLoading,
    accountsLoading
  ]);

  // Query para KPIs familiares - otimizada com RPC
  const { data: familyKPIsData, isLoading: kpisLoading } = useQuery({
    queryKey: ['family', 'kpis', user?.id],
    queryFn: async () => {
      const { data, error } = await getFamilyKPIs();
      if (error) throw error;
      
      return {
        totalBalance: data.total_balance || 0,
        creditCardDebt: data.credit_card_debt || 0,
        topGoalProgress: Math.min(data.top_goal_progress || 0, 100),
        monthlySavings: data.monthly_savings || 0,
        goalsAccountBalance: data.goals_account_balance || 0,
        totalGoalsValue: data.total_goals_value || 0,
        goalsProgressPercentage: Math.min(data.goals_progress_percentage || 0, 100),
        totalBudgetSpent: data.total_budget_spent || 0,
        totalBudgetAmount: data.total_budget_amount || 0,
        budgetSpentPercentage: Math.min(data.budget_spent_percentage || 0, 100),
        totalMembers: data.total_members || 0,
        pendingInvites: data.pending_invites || 0
      };
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000,
  });

  const familyKPIs = familyKPIsData || {
    totalBalance: 0,
    creditCardDebt: 0,
    topGoalProgress: 0,
    monthlySavings: 0,
    goalsAccountBalance: 0,
    totalGoalsValue: 0,
    goalsProgressPercentage: 0,
    totalBudgetSpent: 0,
    totalBudgetAmount: 0,
    budgetSpentPercentage: 0,
    totalMembers: 0,
    pendingInvites: 0
  };

  // Estados de loading
  const isLoading: FamilyLoadingStates = {
    family: familyLoading,
    members: membersLoading,
    accounts: accountsLoading,
    goals: goalsLoading,
    budgets: budgetsLoading,
    transactions: transactionsLoading,
    invites: invitesLoading,
    kpis: kpisLoading,
  };

  // Mutations para gestão de membros
  const inviteMemberMutation = useCrudMutation(
    (data: { email: string; role: string }) => 
      inviteFamilyMember(family?.id || '', data.email, data.role),
    {
      operation: 'create',
      entityName: 'Convite',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'invites', family?.id] });
      }
    }
  );

  const updateMemberRoleMutation = useCrudMutation(
    (data: { memberId: string; role: string }) => 
      updateMemberRole(family?.id || '', data.memberId, data.role),
    {
      operation: 'update',
      entityName: 'Role do Membro',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'members', family?.id] });
      }
    }
  );

  const removeMemberMutation = useCrudMutation(
    (memberId: string) => 
      removeFamilyMember(family?.id || '', memberId),
    {
      operation: 'delete',
      entityName: 'Membro',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'members', family?.id] });
      }
    }
  );

  const updateFamilyMutation = useCrudMutation(
    (data: any) => updateFamilySettings(family?.id || '', data),
    {
      operation: 'update',
      entityName: 'Família',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'current', user?.id] });
      }
    }
  );

  // Mutations CRUD para dados familiares
  const createFamilyAccountMutation = useCrudMutation(
    (data: any) => createAccount({ ...data, family_id: family?.id }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Conta Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const updateFamilyAccountMutation = useCrudMutation(
    ({ id, data }: { id: string; data: any }) => updateAccount(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Conta Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const deleteFamilyAccountMutation = useCrudMutation(
    (id: string) => deleteAccount(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Conta Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const createFamilyGoalMutation = useCrudMutation(
    (data: any) => createGoal({ ...data, family_id: family?.id }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Objetivo Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const updateFamilyGoalMutation = useCrudMutation(
    ({ id, data }: { id: string; data: any }) => updateGoal(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Objetivo Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const deleteFamilyGoalMutation = useCrudMutation(
    (id: string) => deleteGoal(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Objetivo Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const createFamilyBudgetMutation = useCrudMutation(
    (data: any) => createBudget({ ...data, family_id: family?.id }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Orçamento Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id, family?.id] });
      }
    }
  );

  const updateFamilyBudgetMutation = useCrudMutation(
    ({ id, data }: { id: string; data: any }) => updateBudget(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Orçamento Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id, family?.id] });
      }
    }
  );

  const deleteFamilyBudgetMutation = useCrudMutation(
    (id: string) => deleteBudget(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Orçamento Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id, family?.id] });
      }
    }
  );

  const createFamilyTransactionMutation = useCrudMutation(
    (data: any) => createTransaction({ ...data, family_id: family?.id }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Transação Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const updateFamilyTransactionMutation = useCrudMutation(
    ({ id, data }: { id: string; data: any }) => updateTransaction(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Transação Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  const deleteFamilyTransactionMutation = useCrudMutation(
    (id: string) => deleteTransaction(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Transação Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id, family?.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'kpis', family?.id] });
      }
    }
  );

  // Métodos específicos
  const payCreditCard = async (accountId: string, amount: number) => {
    if (!user?.id) throw new Error('Utilizador não autenticado');
    
    const { data, error } = await supabase.rpc('set_credit_card_balance', {
      p_user_id: user.id,
      p_account_id: accountId,
      p_new_balance: amount
    });
    
    if (error) throw error;
    return data;
  };

  const allocateToGoal = async (goalId: string, amount: number, accountId: string) => {
    if (!user?.id) throw new Error('Utilizador não autenticado');
    
    try {
      const { data, error } = await supabase.rpc('allocate_to_goal_with_transaction', {
        goal_id_param: goalId,
        account_id_param: accountId,
        amount_param: amount,
        user_id_param: user.id,
        description_param: 'Alocação para objetivo familiar'
      });
      
      if (error) throw error;
      
      // Invalidar queries relacionadas para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['family', 'goals', user.id, family?.id] });
      queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user.id, family?.id] });
      queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user.id, family?.id] });
      queryClient.invalidateQueries({ queryKey: ['family', 'current', user.id] });
      
      console.log('[FamilyProvider] Goal allocation successful:', data);
      return data;
    } catch (error: any) {
      console.error('[FamilyProvider] Error allocating to goal:', error);
      throw error;
    }
  };

  // Funções de permissão
  const canEdit = (resourceType: 'account' | 'goal' | 'budget' | 'transaction' | 'member') => {
    if (!myRole) return false;
    if (myRole === 'owner' || myRole === 'admin') return true;
    if (myRole === 'member' && ['account', 'goal', 'budget', 'transaction'].includes(resourceType)) return true;
    return false;
  };

  const canDelete = (resourceType: 'account' | 'goal' | 'budget' | 'transaction' | 'member') => {
    if (!myRole) return false;
    if (myRole === 'owner') return true;
    if (myRole === 'admin' && resourceType !== 'member') return true;
    return false;
  };

  // Função para refazer todas as queries
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id, family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id, family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id, family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id, family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'members', family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'invites', family?.id] });
    queryClient.invalidateQueries({ queryKey: ['family', 'current', user?.id] });
  };

  const contextValue: FamilyContextType = {
    // Dados da família
    family,
    members: members as any[],
    myRole,
    pendingInvites: pendingInvites as any[],
    
    // Dados familiares
    familyAccounts,
    familyCards,
    familyGoals,
    familyBudgets,
    familyTransactions,
    
    // KPIs
    familyKPIs: familyKPIs || {
      totalBalance: 0,
      creditCardDebt: 0,
      topGoalProgress: 0,
      monthlySavings: 0,
      totalMembers: 0,
      pendingInvites: 0
    },
    
    // Estados de loading
    isLoading: isLoading,
    
    // Métodos de gestão
    inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => 
      inviteMemberMutation.mutateAsync({ email, role }),
    updateMemberRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => 
      updateMemberRoleMutation.mutateAsync({ memberId, role }),
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    updateFamily: (data: any) => updateFamilyMutation.mutateAsync(data),
    
    // Métodos de gestão de convites
    cancelInvite: async (inviteId: string) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');
      if (!family?.id) throw new Error('Família não encontrada');
      
      try {
        const { data, error } = await supabase.rpc('cancel_family_invite', {
          p_invite_id: inviteId
        });
        
        if (error) throw error;
        
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['family', 'invites', family.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'current', user.id] });
        
        return data;
      } catch (error: any) {
        console.error('Erro ao cancelar convite:', error);
        throw new Error(error.message || 'Erro ao cancelar convite');
      }
    },
    acceptInvite: async (inviteId: string) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');
      if (!family?.id) throw new Error('Família não encontrada');
      
      try {
        const { data, error } = await supabase.rpc('accept_family_invite_by_email', {
          p_invite_id: inviteId
        });
        
        if (error) throw error;
        
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['family', 'invites', family.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'members', family.id] });
        queryClient.invalidateQueries({ queryKey: ['family', 'current', user.id] });
        
        return data;
      } catch (error: any) {
        console.error('Erro ao aceitar convite:', error);
        throw new Error(error.message || 'Erro ao aceitar convite');
      }
    },
    
    // Método para eliminar família
    deleteFamily: async () => {
      if (!user?.id || !family?.id) throw new Error('Utilizador não autenticado ou família não encontrada');
      
      // Verificar se o utilizador é owner
      if (myRole !== 'owner') {
        throw new Error('Apenas o proprietário da família pode eliminá-la');
      }
      
      try {
        // Usar a função RPC robusta para eliminar família com cascade
        const { data, error } = await (supabase as any).rpc('delete_family_with_cascade', {
          p_family_id: family.id
        });
        
        if (error) throw error;
        
        // Invalidar todas as queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['family'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'invites'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'goals'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions'] });
        queryClient.invalidateQueries({ queryKey: ['family', 'current', user.id] });
        
        console.log('Família eliminada com sucesso:', data);
        return data;
      } catch (error: any) {
        console.error('Erro ao eliminar família:', error);
        throw new Error(error.message || 'Erro ao eliminar família. Verifique se tem permissões adequadas.');
      }
    },
    
    // Métodos CRUD para dados familiares
    createFamilyAccount: (data: any) => createFamilyAccountMutation.mutateAsync(data),
    updateFamilyAccount: (id: string, data: any) => updateFamilyAccountMutation.mutateAsync({ id, data }),
    deleteFamilyAccount: (id: string) => deleteFamilyAccountMutation.mutateAsync(id),
    
    createFamilyGoal: (data: any) => createFamilyGoalMutation.mutateAsync(data),
    updateFamilyGoal: (id: string, data: any) => updateFamilyGoalMutation.mutateAsync({ id, data }),
    deleteFamilyGoal: (id: string) => deleteFamilyGoalMutation.mutateAsync(id),
    
    createFamilyBudget: (data: any) => createFamilyBudgetMutation.mutateAsync(data),
    updateFamilyBudget: (id: string, data: any) => updateFamilyBudgetMutation.mutateAsync({ id, data }),
    deleteFamilyBudget: (id: string) => deleteFamilyBudgetMutation.mutateAsync(id),
    
    createFamilyTransaction: (data: any) => createFamilyTransactionMutation.mutateAsync(data),
    updateFamilyTransaction: (id: string, data: any) => updateFamilyTransactionMutation.mutateAsync({ id, data }),
    deleteFamilyTransaction: (id: string) => deleteFamilyTransactionMutation.mutateAsync(id),
    
    // Métodos específicos
    payCreditCard,
    allocateToGoal,
    
    // Utilitários
    refetchAll,
    canEdit,
    canDelete,
  };

  return (
    <FamilyContext.Provider value={contextValue}>
      {children}
    </FamilyContext.Provider>
  );
}; 