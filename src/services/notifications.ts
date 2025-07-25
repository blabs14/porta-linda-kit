import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, type, message, read, created_at
export const getNotifications = (user_id: string) =>
  supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

export const createNotification = (data: {
  user_id: string;
  family_id?: string;
  type: string;
  message: string;
  read?: boolean;
}) => supabase.from('notifications').insert(data);

export const markNotificationRead = (id: string) =>
  supabase.from('notifications').update({ read: true }).eq('id', id);

export const deleteNotification = (id: string) =>
  supabase.from('notifications').delete().eq('id', id); 