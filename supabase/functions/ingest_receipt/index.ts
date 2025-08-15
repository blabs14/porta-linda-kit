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
	const url = new URL(req.url);
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: { ...corsHeaders(req) } });
	}
	const body = await req.json().catch(()=>({} as any));
	const jobId = (body as any)?.job_id || url.searchParams.get('job_id');
	const fileId = (body as any)?.file_id || url.searchParams.get('file_id');
	if (!jobId || !fileId) return new Response(JSON.stringify({ error: 'missing job_id or file_id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

	const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');
	const supabaseUrl = Deno.env.get('SUPABASE_URL') || (projectRef ? `https://${projectRef}.supabase.co` : undefined);
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
	const authHeader = req.headers.get('Authorization') || '';
	if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: 'missing SUPABASE_URL/ANON_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });

	try {
		// Secrets OCR (Google Cloud Vision) - novos nomes com fallback
		const OCR_PROVIDER = (Deno.env.get('OCR_PROVIDER') || 'mock').toLowerCase();
		const GCV_KEY = Deno.env.get('OCR_GCV_API_KEY') || Deno.env.get('OCR_CLOUD_KEY');
		const GCV_ENDPOINT = Deno.env.get('OCR_GCV_ENDPOINT') || Deno.env.get('OCR_CLOUD_ENDPOINT');
		const GCV_ENDPOINT_FILES = Deno.env.get('OCR_GCV_ENDPOINT_FILES') || '';
		// Nota: Implementação real de OCR não incluída aqui; usar GCV_KEY/GCV_ENDPOINT conforme provider.

		await fetch(`${supabaseUrl}/rest/v1/rpc/refresh_staging_dedupe`, {
			method: 'POST',
			headers: { 'apikey': anonKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
			body: JSON.stringify({ p_job_id: jobId })
		});
		return new Response(JSON.stringify({ ok: true, provider: OCR_PROVIDER, endpoint: GCV_ENDPOINT || null }), { headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
	} catch (e) {
		return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } });
	}
}); 