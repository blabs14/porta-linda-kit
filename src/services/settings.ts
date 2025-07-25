import { supabase } from '../lib/supabaseClient';

export const getFamilySettings = async (family_id: string) => {
  return supabase
    .from('families')
    .select('settings')
    .eq('id', family_id)
    .single();
};

export const updateFamilySettings = async (family_id: string, settings: any) => {
  return supabase
    .from('families')
    .update({ settings })
    .eq('id', family_id);
}; 