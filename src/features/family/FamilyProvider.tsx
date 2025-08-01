import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getFamilyData, 
  getFamilyMembers, 
  getPendingInvites,
  inviteFamilyMember,
  updateMemberRole,
  removeFamilyMember,
  updateFamilySettings
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
      const data = await getFamilyData();
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const family = (familyData as any)?.family as Family | null;
  const myRole = (familyData as any)?.myRole as 'owner' | 'admin' | 'member' | 'viewer' | null;

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

  // Query para contas familiares - usar a mesma abordagem que funciona na área pessoal
  const { data: allAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['family', 'accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await getAccountsWithBalances(user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar contas familiares (family_id IS NOT NULL)
  const familyAccounts = (allAccounts as any[]).filter(account => account.family_id !== null);
  const familyCards = familyAccounts.filter(account => account.tipo === 'cartão de crédito');
  const regularFamilyAccounts = familyAccounts.filter(account => account.tipo !== 'cartão de crédito');

  // Query para objetivos familiares
  const { data: allGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['family', 'goals', user?.id],
    queryFn: async () => {
      const { data, error } = await getGoals(user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar objetivos familiares (family_id IS NOT NULL)
  const familyGoals = (allGoals as any[]).filter(goal => goal.family_id !== null);

  // Query para orçamentos familiares
  const { data: allBudgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['family', 'budgets', user?.id],
    queryFn: async () => {
      const { data, error } = await getBudgets();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar orçamentos familiares (family_id IS NOT NULL)
  const familyBudgets = (allBudgets as any[]).filter(budget => budget.family_id !== null);

  // Query para transações familiares
  const { data: allTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['family', 'transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await getTransactions();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Filtrar transações familiares (family_id IS NOT NULL)
  const familyTransactions = (allTransactions as any[]).filter(transaction => transaction.family_id !== null);

  // Calcular KPIs familiares
  const familyKPIs: FamilyKPIs = React.useMemo(() => {
    const totalBalance = familyAccounts.reduce((sum, account) => sum + (account.saldo || 0), 0);
    const creditCardDebt = familyCards.reduce((sum, card) => {
      const balance = card.saldo || 0;
      return balance < 0 ? sum + Math.abs(balance) : sum;
    }, 0);
    
    const topGoal = familyGoals
      .filter(goal => goal.ativa && goal.valor_atual < goal.valor_objetivo)
      .sort((a, b) => {
        const progressA = (a.valor_atual / a.valor_objetivo) * 100;
        const progressB = (b.valor_atual / b.valor_objetivo) * 100;
        return progressB - progressA;
      })[0];
    
    const topGoalProgress = topGoal 
      ? (topGoal.valor_atual / topGoal.valor_objetivo) * 100 
      : 0;
    
    // Calcular poupança mensal (receitas - despesas)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyTransactions = familyTransactions.filter(t => 
      t.data.startsWith(currentMonth)
    );
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + (t.valor || 0), 0);
    
    const monthlyExpenses = monthlyTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + (t.valor || 0), 0);
    
    const monthlySavings = monthlyIncome - monthlyExpenses;
    
    return {
      totalBalance,
      creditCardDebt,
      topGoalProgress,
      monthlySavings,
      totalMembers: members.length,
      pendingInvites: pendingInvites.length
    };
  }, [familyAccounts, familyCards, familyGoals, familyTransactions, members.length, pendingInvites.length]);

  // Estados de loading
  const isLoading: FamilyLoadingStates = {
    family: familyLoading,
    members: membersLoading,
    accounts: accountsLoading,
    goals: goalsLoading,
    budgets: budgetsLoading,
    transactions: transactionsLoading,
    invites: invitesLoading,
    kpis: false, // KPIs são calculados localmente agora
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
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'accounts', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'goals', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id] });
      }
    }
  );

  const updateFamilyBudgetMutation = useCrudMutation(
    ({ id, data }: { id: string; data: any }) => updateBudget(id, data, user?.id || ''),
    {
      operation: 'update',
      entityName: 'Orçamento Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id] });
      }
    }
  );

  const deleteFamilyBudgetMutation = useCrudMutation(
    (id: string) => deleteBudget(id, user?.id || ''),
    {
      operation: 'delete',
      entityName: 'Orçamento Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'budgets', user?.id] });
      }
    }
  );

  const createFamilyTransactionMutation = useCrudMutation(
    (data: any) => createTransaction({ ...data, family_id: family?.id }, user?.id || ''),
    {
      operation: 'create',
      entityName: 'Transação Familiar',
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id] });
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
        queryClient.invalidateQueries({ queryKey: ['family', 'transactions', user?.id] });
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
    
    const { data, error } = await supabase.rpc('allocate_to_goal_with_transaction', {
      goal_id_param: goalId,
      account_id_param: accountId,
      amount_param: amount,
      user_id_param: user.id,
      description_param: 'Alocação para objetivo familiar'
    });
    
    if (error) throw error;
    return data;
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
    queryClient.invalidateQueries({ queryKey: ['family'] });
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