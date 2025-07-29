import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, role, permissions, created_at
export const getRoles = async (family_id: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('user_id, role, permissions')
      .eq('family_id', family_id);
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateRole = async (user_id: string, family_id: string, role: string, permissions: string[]): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .update({ role, permissions })
      .eq('user_id', user_id)
      .eq('family_id', family_id);
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Helpers para roles
export const isAdmin = (role: string): { data: boolean | null; error: any } => {
  try {
    return { data: role === 'admin', error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const isMember = (role: string): { data: boolean | null; error: any } => {
  try {
    return { data: role === 'member', error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const hasRole = (role: string, expected: string): { data: boolean | null; error: any } => {
  try {
    return { data: role === expected, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const hasPermission = (permissions: string[], permission: string): { data: boolean | null; error: any } => {
  try {
    return { data: permissions.includes(permission), error: null };
  } catch (error) {
    return { data: null, error };
  }
}; 