import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  } as Record<string,string>;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function inferDelimiter(headerLine: string): string {
  const candidates = [',',';','\t','|'];
  let best = ','; let max = -1;
  for (const c of candidates) { const ct = (headerLine.match(new RegExp(`\\${c}`, 'g'))||[]).length; if (ct>max) { max = ct; best = c; } }
  return best;
}

function parseCsv(text: string, delimiter?: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  if (lines.length===0) return { headers: [], rows: [] };
  const delim = delimiter || inferDelimiter(lines[0]);
  const headers = lines[0].split(delim).map(h=>h.trim());
  const rows = lines.slice(1).map(l=> l.split(delim));
  return { headers, rows };
}

function normalizeRow(raw: Record<string,string>, mapping: any){
  const dateRaw = raw[mapping.date];
  const fmt = mapping.date_fmt as string|undefined;
  let date = dateRaw;
  if (fmt === 'DD/MM/YYYY' || /\d{2}\/\d{2}\/\d{4}/.test(dateRaw)) {
    const [d,m,y] = dateRaw.split('/'); date = `${y}-${m}-${d}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    date = dateRaw;
  } else { date = new Date(dateRaw).toISOString().slice(0,10); }
  const dec = mapping.decimal || ',';
  const amtStr = String(raw[mapping.amount]||'').replace(dec, '.');
  let amount = Number(amtStr||0);
  if (mapping.debit_sign && amount>0) amount = amount * mapping.debit_sign;
  return {
    date,
    amount_cents: Math.round(amount*100),
    currency: 'EUR',
    description: String(raw[mapping.description]||'').trim(),
    merchant: String(raw[mapping.description]||'').trim()
  };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders(req) } });
  }
  const body = await req.json().catch(()=>({}));
  const jobId = (body as any)?.job_id || url.searchParams.get('job_id');
  if (!jobId) return new Response(JSON.stringify({ error: 'missing job_id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

  const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || (projectRef ? `https://${projectRef}.supabase.co` : undefined);
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') || '';
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: 'missing SUPABASE_URL/ANON_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

  const restHeaders = { 'apikey': anonKey, 'Authorization': authHeader, 'Content-Type': 'application/json' } as Record<string,string>;

  try {
    let mapping = (body as any)?.mapping || {};

    // 1) Buscar ficheiro mais recente do job
    const filesRes = await fetch(`${supabaseUrl}/rest/v1/ingestion_files?job_id=eq.${jobId}&select=storage_bucket,storage_path&order=created_at.desc&limit=1`, {
      headers: restHeaders
    });
    const files = await filesRes.json();
    if (!Array.isArray(files) || files.length===0) {
      return new Response(JSON.stringify({ error: 'no file for job' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
    }
    const { storage_bucket, storage_path } = files[0];

    // 2) Download do CSV do Storage (com fallbacks de path)
    const candidates: string[] = [];
    const basePath = String(storage_path);
    candidates.push(basePath);
    if (basePath.startsWith('imports/')) {
      candidates.push(basePath.replace(/^imports\//, ''));
    } else {
      candidates.push(`imports/${basePath}`);
    }
    // normalizar e remover duplicados
    const unique = Array.from(new Set(candidates));

    let text: string | null = null;
    const attempts: Array<{ url: string; status: number }> = [];
    for (const p of unique) {
      const encodedPath = p.split('/').map(encodeURIComponent).join('/');
      const objUrl = `${supabaseUrl}/storage/v1/object/${storage_bucket}/${encodedPath}`;
      const objRes = await fetch(objUrl, { headers: { 'apikey': anonKey, 'Authorization': authHeader } });
      if (objRes.ok) { text = await objRes.text(); break; }
      attempts.push({ url: objUrl, status: objRes.status });
    }
    if (text === null) {
      console.error('storage_download_failed_all', { attempts });
      return new Response(JSON.stringify({ error: 'failed to download file from storage', attempts }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
    }

    // 3) Parse simples
    const parsed = parseCsv(text);
    const headers = parsed.headers;
    const rows = parsed.rows;

    if (headers.length===0) {
      return new Response(JSON.stringify({ error: 'empty or invalid CSV' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
    }

    // 3.1) Fallback de mapeamento automático se necessário
    const lower = headers.map(h=>h.trim().toLowerCase());
    const findHeader = (cands: string[]) => {
      for (const c of cands) { const idx = lower.findIndex(h=> h===c || h.includes(c)); if (idx>=0) return headers[idx]; }
      return '';
    };
    if (!mapping.date) mapping.date = findHeader(['data','date']);
    if (!mapping.amount) mapping.amount = findHeader(['montante','amount','valor']);
    if (!mapping.description) mapping.description = findHeader(['descrição','descricao','description','desc']);
    if (!mapping.decimal) mapping.decimal = ',';

    if (!mapping.date || !mapping.amount || !mapping.description) {
      return new Response(JSON.stringify({ error: 'missing mapping fields', details: { headers, mapping } }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
    }

    // 4) Inserir em staging via RPC idempotente
    let inserted = 0;
    for (let i=0;i<rows.length;i++){
      const row = rows[i];
      const raw: Record<string,string> = {};
      headers.forEach((h,idx)=> raw[h] = row[idx] ?? '');
      const normalized = normalizeRow(raw, mapping);
      const hash = await sha256Hex(JSON.stringify({ jobId, ...normalized }));
      const ins = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_staging_transaction`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({ p_job_id: jobId, p_row_index: i+1, p_raw_json: raw, p_normalized_json: normalized, p_hash: hash, p_dedupe_status: 'unknown' })
      });
      if (!ins.ok) {
        const msg = await ins.text().catch(()=>String(ins.status));
        return new Response(JSON.stringify({ error: 'failed to insert staging', row: i+1, status: ins.status, detail: msg }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
      }
      inserted++;
      if (inserted>=1000) break; // proteção simples
    }

    // 5) Atualizar status do job e stats
    await fetch(`${supabaseUrl}/rest/v1/ingestion_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      headers: restHeaders,
      body: JSON.stringify({ status: 'normalized', stats_json: { rows: inserted } })
    });

    // 6) Dedupe
    await fetch(`${supabaseUrl}/rest/v1/rpc/refresh_staging_dedupe`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({ p_job_id: jobId })
    });

    return new Response(JSON.stringify({ ok: true, inserted, headers, mapping }), { headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
  }
}); 