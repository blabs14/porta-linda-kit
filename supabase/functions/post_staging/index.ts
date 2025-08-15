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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(req) } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

  const key = Deno.env.get('SERVICE_ROLE_KEY') || req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || (projectRef ? `https://${projectRef}.supabase.co` : undefined);
  if (!supabaseUrl || !key) return new Response(JSON.stringify({ error: 'missing SUPABASE_URL/SERVICE_ROLE_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

  try {
    const { job_id, ids } = await req.json();
    if (!job_id || !Array.isArray(ids) || ids.length===0) {
      return new Response(JSON.stringify({ error: 'missing job_id or ids' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
    }

    // Buscar o job para obter user/scope/family
    const jobRes = await fetch(`${supabaseUrl}/rest/v1/ingestion_jobs?id=eq.${job_id}&select=scope,user_id,family_id`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
    const jobArr = await jobRes.json();
    const job = Array.isArray(jobArr) ? jobArr[0] : jobArr;
    if (!job) return new Response(JSON.stringify({ error: 'job_not_found' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

    // Buscar linhas de staging
    const stRes = await fetch(`${supabaseUrl}/rest/v1/staging_transactions?id=in.(${ids.map((id:string)=>`"${id}"`).join(',')})&select=*`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
    const rows = await stRes.json();

    let posted = 0; const errors: any[] = [];
    for (const r of rows) {
      if (r.dedupe_status === 'duplicate') { continue; }
      const n = r.normalized_json || {};
      const accountId = n.account_id; const categoryId = n.category_id; const amountCents = Number(n.amount_cents||0);
      if (!accountId || !categoryId || !n.date || !amountCents) { errors.push({ id: r.id, error: 'missing account_id/category_id/date/amount', n }); continue; }

      const valorAbs = Math.abs(amountCents)/100.0;
      const tipo = (n.tipo && String(n.tipo)) || (amountCents >= 0 ? 'despesa' : 'receita');
      const descricao = (n.description || n.merchant || '').toString().slice(0,255) || null;

      const payload: Record<string, unknown> = {
        user_id: job.user_id,
        account_id: accountId,
        categoria_id: categoryId,
        valor: valorAbs,
        data: n.date,
        tipo,
        descricao,
        modo: 'importer'
      };
      if (job.scope === 'family' && job.family_id) payload.family_id = job.family_id;

      // Usar RPC de criação de transação regular
      const rpcBody = {
        p_user_id: job.user_id,
        p_account_id: accountId,
        p_categoria_id: categoryId,
        p_valor: valorAbs,
        p_descricao: descricao,
        p_data: n.date,
        p_tipo: tipo
      } as Record<string, unknown>;

      const ins = await fetch(`${supabaseUrl}/rest/v1/rpc/create_regular_transaction`, {
        method: 'POST', headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBody)
      });
      if (!ins.ok) { const msg = await ins.text().catch(()=>String(ins.status)); errors.push({ id: r.id, error: 'insert_failed', status: ins.status, detail: msg, rpcBody }); continue; }
      const created = await ins.json().catch(()=>null);
      const txnId = (created && typeof created === 'object' && 'transaction_id' in (created as Record<string, unknown>)) ? (created as Record<string, unknown>).transaction_id : null;
      if (!txnId) { errors.push({ id: r.id, error: 'insert_no_id', rpcBody, created }); continue; }

      // Atualizar saldo da conta (RPC pode já fazer, mas garantimos)
      await fetch(`${supabaseUrl}/rest/v1/rpc/update_account_balance`, {
        method: 'POST', headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id_param: accountId })
      }).catch(()=>null);

      await fetch(`${supabaseUrl}/rest/v1/staging_transactions?id=eq.${r.id}`, {
        method: 'PATCH', headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_txn_id: txnId })
      });
      posted++;
    }

    return new Response(JSON.stringify({ ok: true, posted, errors, debug: { job } }), { headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
  }
}); 