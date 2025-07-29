import { supabase } from '../lib/supabaseClient';

const BUCKET = 'attachments';

export const uploadAttachment = async (file: File, path: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAttachmentUrl = (path: string): { data: string | null; error: any } => {
  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const downloadAttachment = async (path: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteAttachment = async (path: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).remove([path]);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}; 