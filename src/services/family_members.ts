import { supabase } from '../lib/supabaseClient';

export const getFamilyMembers = () =>
  supabase
    .from('family_members')
    .select('*')
    .order('joined_at', { ascending: true }); 