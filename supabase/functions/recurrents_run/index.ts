import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Declaração leve para satisfazer o linter local (o ambiente real é Deno nas Edge Functions)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

interface Rule {
  id: string;
  scope: 'personal'|'family';
  user_id: string;
  family_id: string | null;
  amount_cents: number;
  currency: string;
  interval_unit: 'day'|'week'|'month'|'year';
  interval_count: number;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  status: 'active'|'paused'|'canceled';
  is_subscription: boolean;
  vendor?: string | null;
  trial_end_date?: string | null;
  cancel_at_period_end?: boolean | null;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function advanceNextRunDate(dateStr: string, unit: Rule['interval_unit'], count: number): string {
  const d = new Date(dateStr);
  switch (unit) {
    case 'day': d.setDate(d.getDate() + count); break;
    case 'week': d.setDate(d.getDate() + 7 * count); break;
    case 'month': return addMonths(d, count).toISOString().slice(0,10);
    case 'year': d.setFullYear(d.getFullYear() + count); break;
  }
  return d.toISOString().slice(0,10);
}

function makePeriodKey(dateStr: string, unit: Rule['interval_unit']): string {
  const d = new Date(dateStr);
  if (unit === 'day') return d.toISOString().slice(0,10);
  if (unit === 'week') {
    const tmp = new Date(d);
    const day = tmp.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday-based
    tmp.setDate(tmp.getDate() + diff);
    return `${tmp.getFullYear()}-W${String(Math.ceil(((tmp.getDate() - 1) / 7) + 1)).padStart(2,'0')}`;
  }
  if (unit === 'month') return d.toISOString().slice(0,7);
  return `${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const previewParam = url.searchParams.get('preview');
  const isPreview = previewParam === 'true';
  const rangeDays = Number(url.searchParams.get('days') || '30');

  // Fallbacks robustos para ambiente/headers
  const authHeader = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  const supabaseProjectRef = Deno.env.get('SUPABASE_PROJECT_REF');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || (supabaseProjectRef ? `https://${supabaseProjectRef}.supabase.co` : undefined);
  const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') || authHeader;
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL/SUPABASE_PROJECT_REF or SERVICE_ROLE_KEY/Authorization' }), { status: 500 });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  } as const;

  try {
    const startedAt = new Date().toISOString();
    const today = new Date();

    // Buscar regras ativas
    const rulesRes = await fetch(`${supabaseUrl}/rest/v1/recurring_rules?status=eq.active&select=*`, { headers });
    const rules: Rule[] = await rulesRes.json();

    const results: any[] = [];

    for (const rule of rules) {
      let cursor = new Date(rule.next_run_date || rule.start_date);
      const endDate = rule.end_date ? new Date(rule.end_date) : null;
      const trialEnd = rule.trial_end_date ? new Date(rule.trial_end_date) : null;

      let iterations = 0;
      while (iterations < 365 && cursor <= new Date(today.getTime() + rangeDays*86400000)) {
        if (cursor < new Date(rule.start_date)) {
          cursor = new Date(advanceNextRunDate(cursor.toISOString().slice(0,10), rule.interval_unit, rule.interval_count));
          iterations++; continue;
        }
        if (endDate && cursor > endDate) break;
        if (trialEnd && cursor <= trialEnd) {
          // Em trial: não lança instância paga
          cursor = new Date(advanceNextRunDate(cursor.toISOString().slice(0,10), rule.interval_unit, rule.interval_count));
          iterations++; continue;
        }

        const periodKey = makePeriodKey(cursor.toISOString().slice(0,10), rule.interval_unit);
        const body = {
          rule_id: rule.id,
          due_date: cursor.toISOString().slice(0,10),
          period_key: periodKey,
          status: cursor <= today ? 'posted' : 'scheduled',
          amount_cents: rule.amount_cents,
          currency: rule.currency
        };

        if (!isPreview) {
          const ins = await fetch(`${supabaseUrl}/rest/v1/recurring_instances`, {
            method: 'POST', headers, body: JSON.stringify(body)
          });
          const ok = ins.ok;
          results.push({ action: 'upsert_instance', ok, rule_id: rule.id, period_key: periodKey });
        } else {
          results.push({ action: 'preview_instance', rule_id: rule.id, period_key: periodKey });
        }

        // Avança cursor
        cursor = new Date(advanceNextRunDate(cursor.toISOString().slice(0,10), rule.interval_unit, rule.interval_count));

        // Cancel at period end
        if (rule.cancel_at_period_end && cursor > today) break;
        iterations++;
      }

      if (!isPreview) {
        const newNext = advanceNextRunDate(rule.next_run_date || rule.start_date, rule.interval_unit, rule.interval_count);
        await fetch(`${supabaseUrl}/rest/v1/recurring_rules?id=eq.${rule.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ last_run_date: new Date().toISOString().slice(0,10), next_run_date: newNext })
        });
      }
    }

    console.log(JSON.stringify({ event: 'recurrents_run', startedAt, finishedAt: new Date().toISOString(), count: results.length }));

    return new Response(JSON.stringify({ ok: true, count: results.length, items: results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    console.error(JSON.stringify({ event: 'recurrents_run_error', error: String(e) }));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

export { advanceNextRunDate, makePeriodKey }; 