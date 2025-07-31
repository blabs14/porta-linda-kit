import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, type, message, read, created_at
export const getNotifications = async (user_id: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createNotification = async (data: {
  user_id: string;
  family_id?: string;
  title: string;
  type: string;
  message: string;
  read?: boolean;
}) => {
  const { data: result, error } = await supabase.from('notifications').insert(data);
  return { data: result, error };
};

export const markNotificationRead = async (id: string) => {
  const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  return { data, error };
};

export const updateNotification = async (id: string, data: {
  title?: string;
  type?: string;
  message?: string;
  read?: boolean;
}) => {
  const { data: result, error } = await supabase.from('notifications').update(data).eq('id', id);
  return { data: result, error };
};

export const deleteNotification = async (id: string) => {
  const { data, error } = await supabase.from('notifications').delete().eq('id', id);
  return { data, error };
}; 