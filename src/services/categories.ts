import { supabase } from '../lib/supabaseClient';

export const getCategories = () =>
  supabase
    .from('categories')
    .select('*')
    .order('nome', { ascending: true }); 