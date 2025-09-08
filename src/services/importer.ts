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

const sb = supabase;

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
  const { data, error } = await supabase.functions.invoke('ingest_csv', {
    body: { job_id: jobId, mapping }
  });
  if (error) throw error;
  // Trigger dedupe RPC explicitamente (idempotente)
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/refresh_staging_dedupe`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_job_id: jobId })
  });
  return data;
}

export async function edgeIngestReceipt(jobId: string, fileId: string){
  const { data, error } = await supabase.functions.invoke('ingest_receipt', {
    body: { job_id: jobId, file_id: fileId }
  });
  if (error) throw error;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/refresh_staging_dedupe`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_job_id: jobId })
  });
  return data;
}

export async function edgePostStaging(jobId: string, ids: string[]){
  // Tentar primeiro com JWT do utilizador
  const { data, error } = await supabase.functions.invoke('post_staging', {
    body: { job_id: jobId, ids }
  });
  if (!error && data?.posted>0) return data;

  // Fallback: se não postou nada mas há linhas únicas selecionadas, tentar via RPC com sessão do utilizador
  if (Array.isArray(ids) && ids.length>0) {
    const { data: staging } = await supabase.from('staging_transactions').select('*').in('id', ids);
    if (Array.isArray(staging) && staging.length>0) {
      let posted = 0; const errors: any[] = [];
      for (const r of staging) {
        if (r.dedupe_status==='duplicate') continue;
        const n = r.normalized_json || {};
        if (!n.account_id || !n.category_id || !n.date || !n.amount_cents) { errors.push({ id: r.id, error:'missing_fields' }); continue; }
        const payload = {
          p_user_id: (await supabase.auth.getUser()).data?.user?.id,
          p_account_id: n.account_id,
          p_categoria_id: n.category_id,
          p_valor: Math.abs(Number(n.amount_cents)/100.0),
          p_descricao: n.description || n.merchant || null,
          p_data: n.date,
          p_tipo: (n.tipo && String(n.tipo)) || (Number(n.amount_cents)>=0 ? 'despesa':'receita')
        };
        const { data: created, error: rpcErr } = await supabase.rpc('create_regular_transaction', payload);
        if (rpcErr || !created || !created.transaction_id) { errors.push({ id: r.id, error: String(rpcErr||'insert_failed'), payload }); continue; }
        await supabase.from('staging_transactions').update({ posted_txn_id: created.transaction_id }).eq('id', r.id);
        posted++;
      }
      return { ok: true, posted, errors, fallback: true };
    }
  }
  return data || { ok: false, posted: 0, errors: [{ error: String(error||'unknown') }] };
}

export async function uploadToBucket(bucket: 'imports'|'receipts', path: string, file: File){
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  return { data, error };
}

export async function insertIngestionFile(jobId: string, bucket: string, path: string, file: File, sha256?: string){
  return sb.from('ingestion_files').insert({ job_id: jobId, storage_bucket: bucket, storage_path: path, original_filename: file.name, mime_type: file.type, size_bytes: file.size, sha256 }).select('*').single();
}