import { supabase } from '../lib/supabaseClient';
import { Family, FamilyMember, FamilyInvite } from '../integrations/supabase/types';

// ============================================================================
// FAMILY MANAGEMENT
// ============================================================================

export const createFamily = async (familyName: string, description?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilizador não autenticado');

  const { data, error } = await supabase.rpc('create_family_with_member', {
    p_family_name: familyName,
    p_description: description || null
  });

  if (error) throw error;
  return data;
};

export const getFamilyData = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    throw authError;
  }
  
  if (!user) {
    throw new Error('Utilizador não autenticado');
  }

  const { data, error } = await supabase.rpc('get_user_family_data');

  if (error) {
    throw error;
  }
  
  return data;
};

export const updateFamilySettings = async (familyId: string, settings: any) => {
  const { data, error } = await supabase.rpc('update_family_settings', {
    p_family_id: familyId,
    p_nome: '', // Required field, but we're only updating settings
    p_settings: settings
  });

  if (error) throw error;
  return data;
};

// ============================================================================
// FAMILY MEMBERS MANAGEMENT
// ============================================================================

export const getFamilyMembers = async (familyId?: string) => {
  // Verificar autenticação primeiro
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    throw authError;
  }
  
  if (!user) {
    throw new Error('Utilizador não autenticado');
  }

  if (familyId) {
    const { data, error } = await supabase.rpc('get_family_members_with_profiles', {
      p_family_id: familyId
    });
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        *,
        profiles:user_id (
          id,
          nome,
          foto_url
        )
      `)
      .order('joined_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

export const updateMemberRole = async (familyId: string, userId: string, newRole: string) => {
  const { data, error } = await supabase.rpc('update_member_role', {
    p_family_id: familyId,
    p_member_user_id: userId,
    p_new_role: newRole
  });

  if (error) throw error;
  return data;
};

export const removeFamilyMember = async (familyId: string, userId: string) => {
  const { data, error } = await supabase.rpc('remove_family_member', {
    p_family_id: familyId,
    p_member_user_id: userId
  });

  if (error) throw error;
  return data;
};

// ============================================================================
// FAMILY INVITES MANAGEMENT
// ============================================================================

export const getPendingInvites = async (familyId?: string) => {
  // Verificar autenticação primeiro
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    throw authError;
  }
  
  if (!user) {
    throw new Error('Utilizador não autenticado');
  }

  if (familyId) {
    const { data, error } = await supabase.rpc('get_family_pending_invites', {
      p_family_id: familyId
    });
    if (error) throw error;
    return data || [];
  } else {
    const { data, error } = await supabase.rpc('get_user_pending_family_invites');
    if (error) throw error;
    return data || [];
  }
};

export const inviteFamilyMember = async (familyId: string, email: string, role: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilizador não autenticado');

  const { data, error } = await supabase.rpc('invite_family_member_by_email', {
    p_family_id: familyId,
    p_email: email.toLowerCase(),
    p_role: role
  });

  if (error) throw error;
  return data;
};

export const cancelFamilyInvite = async (inviteId: string) => {
  const { data, error } = await supabase.rpc('cancel_family_invite', {
    p_invite_id: inviteId
  });

  if (error) throw error;
  return data;
};

export const acceptFamilyInvite = async (inviteId: string) => {
  const { data, error } = await supabase.rpc('accept_family_invite_by_email', {
    p_invite_id: inviteId
  });

  if (error) throw error;
  return data;
};

// ============================================================================
// PERMISSIONS VALIDATION
// ============================================================================

export const validateFamilyPermission = async (familyId: string, requiredRole: string) => {
  const { data, error } = await supabase.rpc('validate_family_permission', {
    p_family_id: familyId,
    p_required_role: requiredRole
  });

  if (error) throw error;
  return data;
};

// ============================================================================
// FAMILY SHARING MANAGEMENT (GOALS ONLY)
// ============================================================================

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

// ============================================================================
// FAMILY STATISTICS
// ============================================================================

export const getFamilyStatistics = async (familyId: string) => {
  // Obter estatísticas da família
  const members = await getFamilyMembers(familyId);
  
  // Calcular estatísticas
  const totalMembers = Array.isArray(members) ? members.length : 0;
  const activeMembers = Array.isArray(members) ? members.filter((m: any) => m.status === 'active').length : 0;
  
  // TODO: Implementar cálculo de gastos e poupanças familiares
  const totalFamilySpent = 0; // Implementar cálculo
  const totalFamilySaved = 0; // Implementar cálculo

  return {
    totalMembers,
    activeMembers,
    totalFamilySpent,
    totalFamilySaved
  };
}; 