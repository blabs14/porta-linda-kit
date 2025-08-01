// Tipos para dados de família
export interface Family {
  id: string;
  nome: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: string[];
  joined_at: string;
  profile?: {
    id: string;
    nome: string;
    foto_url?: string;
  };
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string;
  created_at: string;
  expires_at: string;
  token: string;
  accepted_at?: string;
}

// Tipos para notificações familiares
export interface FamilyNotification {
  id: string;
  user_id: string;
  family_id?: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  read: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
  metadata?: Record<string, any> | null;
}

// Tipos para KPIs familiares
export interface FamilyKPIs {
  totalBalance: number;
  creditCardDebt: number;
  topGoalProgress: number;
  monthlySavings: number;
  totalMembers: number;
  pendingInvites: number;
}

// Tipos para estados de loading
export interface FamilyLoadingStates {
  family: boolean;
  members: boolean;
  accounts: boolean;
  goals: boolean;
  budgets: boolean;
  transactions: boolean;
  invites: boolean;
  kpis: boolean;
}

// Tipos para dados familiares
export interface FamilyData {
  family: Family | null;
  members: FamilyMember[];
  myRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  pendingInvites: FamilyInvite[];
  familyAccounts: any[];
  familyCards: any[];
  familyGoals: any[];
  familyBudgets: any[];
  familyTransactions: any[];
  familyKPIs: FamilyKPIs;
  isLoading: FamilyLoadingStates;
}

// Tipos para métodos de gestão
export interface FamilyMethods {
  // Gestão de membros
  inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<any>;
  updateMemberRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => Promise<any>;
  removeMember: (memberId: string) => Promise<any>;
  updateFamily: (data: any) => Promise<any>;
  
  // Gestão de convites
  cancelInvite: (inviteId: string) => Promise<any>;
  acceptInvite: (inviteId: string) => Promise<any>;
  
  // Eliminação de família
  deleteFamily: () => Promise<any>;
  
  // CRUD para dados familiares
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

// Tipo completo do contexto
export interface FamilyContextType extends FamilyData, FamilyMethods {} 