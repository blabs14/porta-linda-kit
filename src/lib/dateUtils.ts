/**
 * Utilitários para formatação de datas de forma consistente
 * Evita problemas de timezone ao converter datas para string
 */

/**
 * Formatar uma data para YYYY-MM-DD no timezone local
 * Resolve problemas de UTC offset que causam mudanças de dia
 */
export function formatDateLocal(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Usar timezone local para evitar problemas de UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parsear uma string de data YYYY-MM-DD para Date no timezone local
 * Evita que "2024-01-01" seja interpretado como UTC (midnight)
 */
export function parseDateLocal(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Obter o início da semana (segunda-feira) para uma data
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Verificar se duas datas são o mesmo dia (independente do horário)
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return formatDateLocal(date1) === formatDateLocal(date2);
}