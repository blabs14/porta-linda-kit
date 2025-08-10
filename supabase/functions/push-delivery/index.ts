import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

interface DeliveryRequest {
  user_id: string
  payload: {
    title: string
    body?: string
    icon?: string
    url?: string
    items?: Array<{ id: string; title?: string; description?: string }>
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = (await req.json()) as DeliveryRequest
    const { user_id, payload } = body
    if (!user_id || !payload?.title) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { SUPABASE_URL, SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = Deno.env.toObject()
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing VAPID keys' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const supabase = (await import('npm:@supabase/supabase-js')).createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const webpush = await import('npm:web-push')
    webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', user_id)
      .limit(1000)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const results: Array<{ endpoint: string; ok: boolean }> = []
    const list = (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>

    for (const s of list) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      } as any
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          url: payload.url || '/',
          items: payload.items || []
        }))
        results.push({ endpoint: s.endpoint, ok: true })
      } catch (e) {
        const status = (e as any)?.statusCode || (e as any)?.status || null
        if (status === 404 || status === 410) {
          try {
            await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          } catch {}
        }
        results.push({ endpoint: s.endpoint, ok: false })
      }
    }

    return new Response(JSON.stringify({ delivered: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

Deno.serve(handler) 