import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, title, description, date, recurring, created_at
export const getReminders = async (user_id: string) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: true });
  return { data, error };
};

export const createReminder = async (data: {
  user_id: string;
  family_id?: string;
  title: string;
  description?: string;
  date: string;
  recurring?: boolean;
}) => {
  const { data: result, error } = await supabase.from('reminders').insert(data);
  return { data: result, error };
};

export const updateReminder = async (id: string, data: {
  title?: string;
  description?: string;
  date?: string;
  recurring?: boolean;
}) => {
  const { data: result, error } = await supabase.from('reminders').update(data).eq('id', id);
  return { data: result, error };
};

export const deleteReminder = async (id: string) => {
  const { data, error } = await supabase.from('reminders').delete().eq('id', id);
  return { data, error };
}; 