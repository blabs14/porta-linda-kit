// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const { ORIGIN_ALLOW } = Deno.env.toObject()
const allowOrigin = ORIGIN_ALLOW && ORIGIN_ALLOW.length > 0 ? ORIGIN_ALLOW : '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { SUPABASE_URL, SERVICE_ROLE_KEY } = Deno.env.toObject()
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = (await import('npm:@supabase/supabase-js')).createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await (supabase as any).rpc('apply_fixed_monthly_contributions', { p_date: today })
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, inserted: data ?? 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

Deno.serve(handler) 