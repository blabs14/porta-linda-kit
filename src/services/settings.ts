import { supabase } from '../lib/supabaseClient';

// Tipo para configurações da família
export interface FamilySettings {
  currency?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    budget_alerts?: boolean;
    goal_reminders?: boolean;
  };
  privacy?: {
    show_balances?: boolean;
    allow_member_invites?: boolean;
  };
  preferences?: {
    default_account_type?: string;
    auto_categorize?: boolean;
    require_approval?: boolean;
  };
  [key: string]: unknown; // Para flexibilidade futura
}

export const getFamilySettings = async (family_id: string) => {
  const { data, error } = await supabase
    .from('families')
    .select('settings')
    .eq('id', family_id)
    .single();
  return { data, error };
};

export const updateFamilySettings = async (family_id: string, settings: FamilySettings) => {
  const { data, error } = await supabase
    .from('families')
    .update({ settings })
    .eq('id', family_id);
  return { data, error };
};