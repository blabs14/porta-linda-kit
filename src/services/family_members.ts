import { supabase } from '../lib/supabaseClient';

export const getFamilyMembers = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('joined_at', { ascending: true });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}; 