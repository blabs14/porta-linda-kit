import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useCrudMutation } from '../../hooks/useMutationWithFeedback';
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
  getAccountsWithBalances 
} from '../../services/accounts';
import { 
  getGoals 
} from '../../services/goals';
import { 
  getBudgets 
} from '../../services/budgets';
import { 
  getTransactions 
} from '../../services/transactions';
import { useGoals } from '../../hooks/useGoalsQuery';
import { useBudgets } from '../../hooks/useBudgetsQuery';
import { useTransactions } from '../../hooks/useTransactionsQuery';
import { supabase } from '../../lib/supabaseClient';

// Tipos para o contexto familiar
interface FamilyContextType {
  // Dados da família atual
  family: any;
  members: any[];
  myRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  pendingInvites: any[];
  
  // Dados familiares (family_id IS NOT NULL)
  familyAccounts: any[];
  familyCards: any[];
  familyGoals: any[];
  familyBudgets: any[];
  familyTransactions: any[];
  
  // KPIs familiares
  familyKPIs: {
    totalBalance: number;
    creditCardDebt: number;
    topGoalProgress: number;
    monthlySavings: number;
    totalMembers: number;
    pendingInvites: number;
  };
  
  // Estados de loading
  isLoading: {
    family: boolean;
    members: boolean;
    accounts: boolean;
    goals: boolean;
    budgets: boolean;
    transactions: boolean;
    invites: boolean;
    kpis: boolean;
  };
  
  // Métodos de gestão de membros
  inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<any>;
  updateMemberRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => Promise<any>;
  removeMember: (memberId: string) => Promise<any>;
  updateFamily: (data: any) => Promise<any>;
  
  // Métodos CRUD para dados familiares
  createFamilyAccount: (data: any) => Promise<any>;
  updateFamilyAccount: (id: string, data: any) => Promise<any>;
  deleteFamilyAccount: (id: string) => Promise<any>;
  
  createFamilyGoal: (data: any) => Promise<any>;
  updateFamilyGoal: (id: string, data: any) => Promise<any>;
  deleteFamilyGoal: (id: string) => Promise<any>;
  
  createFamilyBudget: (data: any) => Promise<any>;
  updateFamilyBudget: (id: string, data: any) => Promise<any>;
  deleteFamilyBudget: (id: string) => Promise<any>;
  
  createFamilyTransaction: (data: any) => Promise<any>;
  updateFamilyTransaction: (id: string, data: any) => Promise<any>;
  deleteFamilyTransaction: (id: string) => Promise<any>;
  
  // Métodos específicos
  payCreditCard: (accountId: string, amount: number) => Promise<any>;
  allocateToGoal: (goalId: string, amount: number, accountId: string) => Promise<any>;
  
  // Utilitários
  refetchAll: () => void;
  canEdit: (resourceType: 'account' | 'goal' | 'budget' | 'transaction' | 'member') => boolean;
  canDelete: (resourceType: 'account' | 'goal' | 'budget' | 'transaction' | 'member') => boolean;
}

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
  const { data: familyData = null, isLoading: familyLoading } = useQuery({
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

  // Extrair dados da família do resultado
  const family = familyData && typeof familyData === 'object' && 'family' in familyData 
    ? (familyData as any).family 
    : null;

  // Query para membros da família
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['family', 'members', family?.id],
    queryFn: async () => {
      const data = await getFamilyMembers(family?.id);
      return data || [];
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
      const data = await getPendingInvites(family?.id);
      return data || [];
    },
    enabled: !!family?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Query para contas familiares - usar exatamente a mesma abordagem que funciona
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
  const familyAccounts = React.useMemo(() => {
    return (allAccounts as any[]).filter(account => account.family_id === family?.id);
  }, [allAccounts, family?.id]);

  // Separar cartões de crédito
  const familyCards = React.useMemo(() => {
    return familyAccounts.filter(account => account.tipo === 'cartão de crédito');
  }, [familyAccounts]);

  // Query para objetivos familiares - usar o hook existente
  const { goals: allGoals = [], isLoading: goalsLoading } = useGoals();
  
  // Filtrar objetivos familiares
  const familyGoals = React.useMemo(() => {
    return (allGoals as any[]).filter(goal => goal.family_id === family?.id);
  }, [allGoals, family?.id]);

  // Query para orçamentos familiares - usar o hook existente
  const { data: allBudgets = [], isLoading: budgetsLoading } = useBudgets();
  
  // Filtrar orçamentos familiares
  const familyBudgets = React.useMemo(() => {
    return (allBudgets as any[]).filter(budget => budget.family_id === family?.id);
  }, [allBudgets, family?.id]);

  // Query para transações familiares - usar o hook existente
  const { data: allTransactions = [], isLoading: transactionsLoading } = useTransactions();
  
  // Filtrar transações familiares
  const familyTransactions = React.useMemo(() => {
    return (allTransactions as any[]).filter(transaction => transaction.family_id === family?.id);
  }, [allTransactions, family?.id]);

  // Determinar o papel do utilizador atual
  const myRole = React.useMemo(() => {
    if (!family || !user) return null;
    const member = (members as any[]).find(m => m.user_id === user.id);
    return member?.role || null;
  }, [family, user, members]);

  // Calcular KPIs familiares
  const familyKPIs = React.useMemo(() => {
    const totalBalance = familyAccounts.reduce((sum, account) => sum + (account.saldo_atual || 0), 0);
    
    const creditCardDebt = familyCards.reduce((sum, card) => {
      const debt = (card.saldo_atual || 0) < 0 ? Math.abs(card.saldo_atual) : 0;
      return sum + debt;
    }, 0);

    const activeGoals = familyGoals.filter(goal => goal.ativa);
    const topGoal = activeGoals.sort((a, b) => (b.valor_atual || 0) - (a.valor_atual || 0))[0];
    const topGoalProgress = topGoal ? ((topGoal.valor_atual || 0) / (topGoal.valor_objetivo || 1)) * 100 : 0;

    // Calcular poupança mensal (receitas - despesas do mês atual)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTransactions = familyTransactions.filter(t => t.data.startsWith(currentMonth));
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
      totalMembers: (members as any[]).length,
      pendingInvites: (pendingInvites as any[]).filter(invite => invite.status === 'pending').length
    };
  }, [familyAccounts, familyCards, familyGoals, familyTransactions, members, pendingInvites]);

  // Mutations para gestão de membros
  const inviteMemberMutation = useCrudMutation({
    mutationFn: (data: { email: string; role: string }) => 
      inviteFamilyMember(family?.id || '', data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'invites'] });
    }
  });

  const updateMemberRoleMutation = useCrudMutation({
    mutationFn: (data: { memberId: string; role: string }) => 
      updateMemberRole(family?.id || '', data.memberId, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
    }
  });

  const removeMemberMutation = useCrudMutation({
    mutationFn: (memberId: string) => 
      removeFamilyMember(family?.id || '', memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
    }
  });

  const updateFamilyMutation = useCrudMutation({
    mutationFn: (data: any) => updateFamilySettings(family?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'current'] });
    }
  });

  // Mutations CRUD para dados familiares
  const createFamilyAccountMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'accounts'] });
    }
  });

  const updateFamilyAccountMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'accounts'] });
    }
  });

  const deleteFamilyAccountMutation = useCrudMutation({
    mutationFn: (id: string) => {
      return { id, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'accounts'] });
    }
  });

  const createFamilyGoalMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'goals'] });
    }
  });

  const updateFamilyGoalMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'goals'] });
    }
  });

  const deleteFamilyGoalMutation = useCrudMutation({
    mutationFn: (id: string) => {
      return { id, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'goals'] });
    }
  });

  const createFamilyBudgetMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'budgets'] });
    }
  });

  const updateFamilyBudgetMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'budgets'] });
    }
  });

  const deleteFamilyBudgetMutation = useCrudMutation({
    mutationFn: (id: string) => {
      return { id, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'budgets'] });
    }
  });

  const createFamilyTransactionMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'transactions'] });
    }
  });

  const updateFamilyTransactionMutation = useCrudMutation({
    mutationFn: (data: any) => {
      return { ...data, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'transactions'] });
    }
  });

  const deleteFamilyTransactionMutation = useCrudMutation({
    mutationFn: (id: string) => {
      return { id, family_id: family?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'transactions'] });
    }
  });

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
    members,
    myRole,
    pendingInvites,
    
    // Dados familiares
    familyAccounts,
    familyCards,
    familyGoals,
    familyBudgets,
    familyTransactions,
    
    // KPIs
    familyKPIs,
    
    // Estados de loading
    isLoading: {
      family: familyLoading,
      members: membersLoading,
      accounts: accountsLoading,
      goals: goalsLoading,
      budgets: budgetsLoading,
      transactions: transactionsLoading,
      invites: invitesLoading,
      kpis: false, // Calculado localmente
    },
    
    // Métodos de gestão
    inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => 
      inviteMemberMutation.mutateAsync({ email, role }),
    updateMemberRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => 
      updateMemberRoleMutation.mutateAsync({ memberId, role }),
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    updateFamily: (data: any) => updateFamilyMutation.mutateAsync(data),
    
    // Métodos CRUD para dados familiares
    createFamilyAccount: (data: any) => createFamilyAccountMutation.mutateAsync(data),
    updateFamilyAccount: (id: string, data: any) => updateFamilyAccountMutation.mutateAsync({ id, data }),
    deleteFamilyAccount: (id: string) => deleteFamilyAccountMutation.mutateAsync({ id }),
    
    createFamilyGoal: (data: any) => createFamilyGoalMutation.mutateAsync(data),
    updateFamilyGoal: (id: string, data: any) => updateFamilyGoalMutation.mutateAsync({ id, data }),
    deleteFamilyGoal: (id: string) => deleteFamilyGoalMutation.mutateAsync({ id }),
    
    createFamilyBudget: (data: any) => createFamilyBudgetMutation.mutateAsync(data),
    updateFamilyBudget: (id: string, data: any) => updateFamilyBudgetMutation.mutateAsync({ id, data }),
    deleteFamilyBudget: (id: string) => deleteFamilyBudgetMutation.mutateAsync({ id }),
    
    createFamilyTransaction: (data: any) => createFamilyTransactionMutation.mutateAsync(data),
    updateFamilyTransaction: (id: string, data: any) => updateFamilyTransactionMutation.mutateAsync({ id, data }),
    deleteFamilyTransaction: (id: string) => deleteFamilyTransactionMutation.mutateAsync({ id }),
    
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