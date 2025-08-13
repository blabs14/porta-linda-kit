export function parseDatePt(value: string, fmt?: string): string {
  // Suporta DD/MM/YYYY ou YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [d,m,y] = value.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toISOString().slice(0,10);
}

export async function computeHash(data: any, scope: 'personal'|'family', subjectId: string): Promise<string> {
  const base = JSON.stringify({ scope, subjectId, ...data });
  const enc = new TextEncoder().encode(base);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function normalizeRow(raw: any, mapping: any, opts?: { decimal?: string, debit_sign?: number }){
  const dateStr = parseDatePt(raw[mapping.date], mapping.date_fmt);
  const dec = mapping.decimal || opts?.decimal || ',';
  const amtStr = String(raw[mapping.amount]||'').replace(dec, '.');
  let amount = Number(amtStr||0);
  if ((mapping.debit_sign||opts?.debit_sign) && amount>0) amount = amount * (mapping.debit_sign||opts?.debit_sign||1);
  return {
    date: dateStr,
    amount_cents: Math.round(amount*100),
    currency: 'EUR',
    description: String(raw[mapping.description]||'').trim(),
    merchant: String(raw[mapping.description]||'').trim()
  };
} 