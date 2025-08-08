import { supabase } from '../../../lib/supabaseClient';
import { mapInviteToSummary, mapMemberToSummary } from '../../../shared/types/family';

export const familyService = {
  async createFamily(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');
    const { data, error } = await supabase.rpc('create_family_with_member', {
      p_family_name: name,
      p_description: description || null,
    });
    if (error) throw error;
    return data;
  },

  async getFamilyData() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Utilizador não autenticado');
    const { data, error } = await supabase.rpc('get_user_family_data');
    if (error) throw error;
    return data;
  },

  async getMembers(familyId?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Utilizador não autenticado');

    if (familyId) {
      const { data, error } = await supabase.rpc('get_family_members_with_profiles', { p_family_id: familyId });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows.map(mapMemberToSummary);
    }
    const { data, error } = await supabase
      .from('family_members')
      .select(`*, profiles:user_id ( id, nome, foto_url )`)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    return rows.map(mapMemberToSummary);
  },

  async getPendingInvites(familyId?: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Utilizador não autenticado');

    if (familyId) {
      const { data, error } = await supabase.rpc('get_family_pending_invites', { p_family_id: familyId });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows.map(mapInviteToSummary);
    }
    const { data, error } = await supabase.rpc('get_user_pending_family_invites');
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    return rows.map(mapInviteToSummary);
  },
}; 