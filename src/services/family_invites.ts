import { supabase } from '../lib/supabaseClient';

export const getFamilyInvites = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('family_invites')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createFamilyInvite = async (data: {
  family_id: string;
  email: string;
  role: string;
  status?: string;
  invited_by?: string;
  expires_at?: string;
  token?: string;
  accepted_at?: string;
}): Promise<{ data: any | null; error: any }> => {
  try {
    // Garantir que expires_at e invited_by são obrigatórios conforme o schema
    const insertData = {
      ...data,
      expires_at: data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias por padrão
      invited_by: data.invited_by || 'system'
    };
    
    const { data: result, error } = await supabase.from('family_invites').insert(insertData);
    return { data: result, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateFamilyInvite = async (id: string, data: {
  family_id?: string;
  email?: string;
  role?: string;
  status?: string;
  invited_by?: string;
  expires_at?: string;
  token?: string;
  accepted_at?: string;
}): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.from('family_invites').update(data).eq('id', id);
    return { data: result, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteFamilyInvite = async (id: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.from('family_invites').delete().eq('id', id);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}; 