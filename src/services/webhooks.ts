import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, url, event, active, created_at
// NOTA: A tabela 'webhooks' não existe no schema atual
// export const getWebhooks = async (): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase
//       .from('webhooks')
//       .select('*')
//       .order('created_at', { ascending: false });
    
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// export const createWebhook = async (data: {
//   url: string;
//   event: string;
//   active?: boolean;
// }): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data: result, error } = await supabase.from('webhooks').insert(data);
//     return { data: result, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// export const updateWebhook = async (id: string, data: {
//   url?: string;
//   event?: string;
//   active?: boolean;
// }): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data: result, error } = await supabase.from('webhooks').update(data).eq('id', id);
//     return { data: result, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// export const deleteWebhook = async (id: string): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase.from('webhooks').delete().eq('id', id);
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// }; 