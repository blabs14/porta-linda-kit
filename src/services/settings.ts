import { supabase } from '../lib/supabaseClient';

export const getFamilySettings = async (family_id: string) => {
  const { data, error } = await supabase
    .from('families')
    .select('settings')
    .eq('id', family_id)
    .single();
  return { data, error };
};

export const updateFamilySettings = async (family_id: string, settings: any) => {
  const { data, error } = await supabase
    .from('families')
    .update({ settings })
    .eq('id', family_id);
  return { data, error };
}; 