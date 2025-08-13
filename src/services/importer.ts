import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';

export const mappingProfileSchema = z.object({
  bank_name: z.string().min(1),
  mapping_json: z.record(z.any()),
});

export const ingestionJobSchema = z.object({
  scope: z.enum(['personal','family']),
  user_id: z.string().uuid(),
  family_id: z.string().uuid().nullable().optional(),
  source: z.enum(['csv','excel','receipt'])
});

export type IngestionJob = z.infer<typeof ingestionJobSchema> & { id?: string };

const sb: any = supabase as any;

export async function createIngestionJob(input: IngestionJob){
  const parsed = ingestionJobSchema.parse(input);
  return sb.from('ingestion_jobs').insert(parsed).select('*').single();
}

export async function listJobs(scope: 'personal'|'family', familyId?: string){
  let q = sb.from('ingestion_jobs').select('*').order('started_at', { ascending: false });
  if (scope==='family') q = q.eq('family_id', familyId).eq('scope','family');
  else q = q.eq('scope','personal');
  return q;
}

export async function listStaging(jobId: string){
  return sb.from('staging_transactions').select('*').eq('job_id', jobId).order('created_at', { ascending: true });
}

export async function markDuplicate(id: string){
  return sb.from('staging_transactions').update({ dedupe_status: 'duplicate' }).eq('id', id);
}

export async function updateNormalized(id: string, patch: any){
  return sb.from('staging_transactions').update({ normalized_json: patch }).eq('id', id);
}

export async function edgeIngestCSV(jobId: string, mapping?: any){
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest_csv?job_id=${jobId}`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' }, body: JSON.stringify({ mapping })});
  return res.json();
}

export async function edgeIngestReceipt(jobId: string, fileId: string){
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest_receipt?job_id=${jobId}&file_id=${fileId}`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}` }});
  return res.json();
}

export async function edgePostStaging(jobId: string, ids: string[]){
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_staging`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' }, body: JSON.stringify({ job_id: jobId, ids })});
  return res.json();
}

export async function uploadToBucket(bucket: 'imports'|'receipts', path: string, file: File){
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  return { data, error };
}

export async function insertIngestionFile(jobId: string, bucket: string, path: string, file: File, sha256?: string){
  return sb.from('ingestion_files').insert({ job_id: jobId, storage_bucket: bucket, storage_path: path, original_filename: file.name, mime_type: file.type, size_bytes: file.size, sha256 }).select('*').single();
} 