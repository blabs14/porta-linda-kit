import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, url, event, active, created_at
export const getWebhooks = () =>
  supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });

export const createWebhook = (data: {
  url: string;
  event: string;
  active?: boolean;
}) => supabase.from('webhooks').insert(data);

export const updateWebhook = (id: string, data: {
  url?: string;
  event?: string;
  active?: boolean;
}) => supabase.from('webhooks').update(data).eq('id', id);

export const deleteWebhook = (id: string) =>
  supabase.from('webhooks').delete().eq('id', id); 