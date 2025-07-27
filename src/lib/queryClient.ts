import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      // Manter cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Retry 3 vezes em caso de erro
      retry: 3,
      // Retry com delay exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: false,
      // Refetch quando reconecta
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry 1 vez para mutations
      retry: 1,
    },
  },
});

// Query keys para organização
export const queryKeys = {
  // Transações
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transactions', id] as const,
  transactionsByUser: (userId: string) => ['transactions', 'user', userId] as const,
  transactionsByFamily: (familyId: string) => ['transactions', 'family', familyId] as const,
  
  // Contas
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  accountsByUser: (userId: string) => ['accounts', 'user', userId] as const,
  
  // Categorias
  categories: ['categories'] as const,
  category: (id: string) => ['categories', id] as const,
  categoriesByUser: (userId: string) => ['categories', 'user', userId] as const,
  categoriesByFamily: (familyId: string) => ['categories', 'family', familyId] as const,
  
  // Objetivos
  goals: ['goals'] as const,
  goal: (id: string) => ['goals', id] as const,
  goalsByUser: (userId: string) => ['goals', 'user', userId] as const,
  goalsByFamily: (familyId: string) => ['goals', 'family', familyId] as const,
  
  // Famílias
  families: ['families'] as const,
  family: (id: string) => ['families', id] as const,
  familiesByUser: (userId: string) => ['families', 'user', userId] as const,
  
  // Membros da família
  familyMembers: ['family-members'] as const,
  familyMembersByFamily: (familyId: string) => ['family-members', 'family', familyId] as const,
  
  // Convites da família
  familyInvites: ['family-invites'] as const,
  familyInvitesByFamily: (familyId: string) => ['family-invites', 'family', familyId] as const,
  
  // Despesas fixas
  fixedExpenses: ['fixed-expenses'] as const,
  fixedExpensesByUser: (userId: string) => ['fixed-expenses', 'user', userId] as const,
  
  // Perfis
  profiles: ['profiles'] as const,
  profile: (id: string) => ['profiles', id] as const,
  profileByUser: (userId: string) => ['profiles', 'user', userId] as const,
  
  // Dashboard
  dashboard: ['dashboard'] as const,
  dashboardStats: (userId: string) => ['dashboard', 'stats', userId] as const,
  dashboardRecentTransactions: (userId: string) => ['dashboard', 'recent-transactions', userId] as const,
  dashboardTopCategories: (userId: string) => ['dashboard', 'top-categories', userId] as const,
} as const; 