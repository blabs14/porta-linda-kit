import { supabase } from '../lib/supabaseClient';
import { familyService } from '../features/family/services/family.service';

export const updateFamilySettings = async (familyId: string, settings: any) => {
  const { data, error } = await supabase.rpc('update_family_settings', {
    p_family_id: familyId,
    p_nome: '',
    p_settings: settings,
  });
  if (error) throw error;
  return data;
};

export const updateMemberRole = async (familyId: string, userId: string, newRole: string) => {
  const { data, error } = await supabase.rpc('update_member_role', {
    p_family_id: familyId,
    p_member_user_id: userId,
    p_new_role: newRole,
  });
  if (error) throw error;
  return data;
};

export const removeFamilyMember = async (familyId: string, userId: string) => {
  const { data, error } = await supabase.rpc('remove_family_member', {
    p_family_id: familyId,
    p_member_user_id: userId,
  });
  if (error) throw error;
  return data;
};

export const inviteFamilyMember = async (familyId: string, email: string, role: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilizador não autenticado');
  const { data, error } = await supabase.rpc('invite_family_member_by_email', {
    p_family_id: familyId,
    p_email: email.toLowerCase(),
    p_role: role,
  });
  if (error) throw error;
  return data;
};

export const cancelFamilyInvite = async (inviteId: string) => {
  const { data, error } = await supabase.rpc('cancel_family_invite', {
    p_invite_id: inviteId,
  });
  if (error) throw error;
  return data;
};

export const acceptFamilyInvite = async (inviteId: string) => {
  const { data, error } = await supabase.rpc('accept_family_invite_by_email', {
    p_invite_id: inviteId,
  });
  if (error) throw error;
  return data;
};

export const shareGoalWithFamily = async (goalId: string, familyId: string) => {
  const { data, error } = await supabase
    .from('goals')
    .update({ family_id: familyId })
    .eq('id', goalId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const unshareGoalFromFamily = async (goalId: string) => {
  const { data, error } = await supabase
    .from('goals')
    .update({ family_id: null })
    .eq('id', goalId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getFamilyStatistics = async (familyId: string) => {
  const members = await familyService.getMembers(familyId);
  const totalMembers = Array.isArray(members) ? members.length : 0;
  const activeMembers = Array.isArray(members) ? members.filter((m: any) => (m as any).status === 'active').length : 0;
  const totalFamilySpent = 0;
  const totalFamilySaved = 0;
  return { totalMembers, activeMembers, totalFamilySpent, totalFamilySaved };
};

export const getFamilyKPIs = async () => {
  const { data, error } = await supabase.rpc('get_family_kpis');
  if (error) {
    console.error('Error fetching family KPIs:', error);
    throw error;
  }
  return {
    data: data?.[0] || {
      total_balance: 0,
      credit_card_debt: 0,
      top_goal_progress: 0,
      monthly_savings: 0,
      goals_account_balance: 0,
      total_goals_value: 0,
      goals_progress_percentage: 0,
      total_budget_spent: 0,
      total_budget_amount: 0,
      budget_spent_percentage: 0,
      total_members: 0,
      pending_invites: 0,
    },
    error: null,
  };
}; 