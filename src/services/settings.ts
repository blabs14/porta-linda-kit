import { supabase } from '../lib/supabaseClient';

export type FamilySettings = Record<string, unknown>;

export const getFamilySettings = async (
  familyId: string
): Promise<{ data: FamilySettings | null; error: unknown }> => {
  const { data, error } = await supabase
    .from('families')
    .select('settings')
    .eq('id', familyId)
    .single();

  if (error) {
    return { data: null, error };
  }

  const settings = (data?.settings ?? null) as unknown as FamilySettings | null;
  return { data: settings, error: null };
};

export const updateFamilySettings = async (
  familyId: string,
  settings: FamilySettings
): Promise<{ data: FamilySettings | null; error: unknown }> => {
  const { data, error } = await supabase
    .from('families')
    .update({ settings })
    .eq('id', familyId)
    .select('settings')
    .single();

  if (error) {
    return { data: null, error };
  }

  const updated = (data?.settings ?? null) as unknown as FamilySettings | null;
  return { data: updated, error: null };
}; 