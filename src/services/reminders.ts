import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, title, description, date, recurring, created_at
export const getReminders = (user_id: string) =>
  supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: true });

export const createReminder = (data: {
  user_id: string;
  family_id?: string;
  title: string;
  description?: string;
  date: string;
  recurring?: boolean;
}) => supabase.from('reminders').insert(data);

export const updateReminder = (id: string, data: {
  title?: string;
  description?: string;
  date?: string;
  recurring?: boolean;
}) => supabase.from('reminders').update(data).eq('id', id);

export const deleteReminder = (id: string) =>
  supabase.from('reminders').delete().eq('id', id); 