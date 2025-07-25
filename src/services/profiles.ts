import { supabase } from '../lib/supabaseClient';

export const getProfiles = () =>
  supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

export const getProfileByUserId = (user_id: string) =>
  supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();

export const updateProfile = (id: string, data: {
  nome?: string;
  foto_url?: string;
  percentual_divisao?: number;
  poupanca_mensal?: number;
  updated_at?: string;
}) => supabase.from('profiles').update(data).eq('id', id); 