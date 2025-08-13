export type IntervalUnit = 'day'|'week'|'month'|'year';

export function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function advanceNextRunDate(dateStr: string, unit: IntervalUnit, count: number): string {
  const d = new Date(dateStr);
  switch (unit) {
    case 'day': d.setDate(d.getDate() + count); break;
    case 'week': d.setDate(d.getDate() + 7 * count); break;
    case 'month': return addMonthsSafe(d, count).toISOString().slice(0,10);
    case 'year': d.setFullYear(d.getFullYear() + count); break;
  }
  return d.toISOString().slice(0,10);
}

export function makePeriodKey(dateStr: string, unit: IntervalUnit): string {
  const d = new Date(dateStr);
  if (unit === 'day') return d.toISOString().slice(0,10);
  if (unit === 'week') {
    const tmp = new Date(d);
    const day = tmp.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    tmp.setDate(tmp.getDate() + diff);
    return `${tmp.getFullYear()}-W${String(Math.ceil(((tmp.getDate() - 1) / 7) + 1)).padStart(2,'0')}`;
  }
  if (unit === 'month') return d.toISOString().slice(0,7);
  return `${d.getFullYear()}`;
} 