import { supabase } from '../lib/supabaseClient';

const BUCKET = 'attachments';

export const uploadAttachment = async (file: File, path: string) => {
  return supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
};

export const getAttachmentUrl = (path: string) => {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

export const downloadAttachment = async (path: string) => {
  return supabase.storage.from(BUCKET).download(path);
};

export const deleteAttachment = async (path: string) => {
  return supabase.storage.from(BUCKET).remove([path]);
}; 