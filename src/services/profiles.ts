import { supabase } from '../lib/supabaseClient';

export const getProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getProfileByUserId = async (user_id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { data, error };
};

export const updateProfile = async (id: string, data: {
  nome?: string;
  foto_url?: string;
  percentual_divisao?: number;
  poupanca_mensal?: number;
  updated_at?: string;
}) => {
  const { data: result, error } = await supabase.from('profiles').update(data).eq('id', id);
  return { data: result, error };
}; 