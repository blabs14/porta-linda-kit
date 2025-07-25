import { supabase } from '../lib/supabaseClient';

export const getFamilyInvites = () =>
  supabase
    .from('family_invites')
    .select('*')
    .order('created_at', { ascending: false });

export const createFamilyInvite = (data: {
  family_id: string;
  email: string;
  role: string;
  status?: string;
  invited_by?: string;
  expires_at?: string;
  token?: string;
  accepted_at?: string;
}) => supabase.from('family_invites').insert(data);

export const updateFamilyInvite = (id: string, data: {
  family_id?: string;
  email?: string;
  role?: string;
  status?: string;
  invited_by?: string;
  expires_at?: string;
  token?: string;
  accepted_at?: string;
}) => supabase.from('family_invites').update(data).eq('id', id);

export const deleteFamilyInvite = (id: string) =>
  supabase.from('family_invites').delete().eq('id', id); 