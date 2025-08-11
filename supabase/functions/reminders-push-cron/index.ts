// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

interface ReminderRow {
  id: string
  user_id: string
  title?: string
  description?: string
  data?: string
  date?: string
}

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

    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    // Env vars
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

    // Lembretes de hoje
    const { data, error } = await supabase
      .from('reminders')
      .select('id,user_id,title,description,data,date')
      .lte('date', today)
      .limit(500)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const reminders = (data || []) as ReminderRow[]

    // Agrupar por utilizador
    const byUser = new Map<string, ReminderRow[]>()
    for (const r of reminders) {
      const u = r.user_id
      if (!u) continue
      if (!byUser.has(u)) byUser.set(u, [])
      byUser.get(u)!.push(r)
    }

    // Envio direto
    const deliveries: any[] = []
    for (const [userId, userReminders] of byUser.entries()) {
      const payload = {
        title: 'Lembretes do dia',
        body: `${userReminders.length} lembrete(s) agendado(s) para hoje`,
        items: userReminders.map(r => ({ id: r.id, title: r.title, description: r.description })),
      }

      // Buscar subs do utilizador
      const { data: subs, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('endpoint,p256dh,auth')
        .eq('user_id', userId)
        .limit(1000)

      if (subErr) {
        deliveries.push({ userId, ok: false, error: subErr.message })
        continue
      }

      const list = (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>
      let okAny = false
      const results: Array<{ endpoint: string; ok: boolean; status?: number }> = []

      for (const s of list) {
        const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload))
          results.push({ endpoint: s.endpoint, ok: true })
          okAny = true
        } catch (e) {
          const status = (e as any)?.statusCode || (e as any)?.status || null
          results.push({ endpoint: s.endpoint, ok: false, status })
          if (status === 404 || status === 410) {
            try { await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint) } catch {}
          }
        }
      }

      deliveries.push({ userId, ok: okAny, results })
    }

    return new Response(JSON.stringify({ deliveries }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

Deno.serve(handler) 