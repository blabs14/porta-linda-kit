export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

function resolveLevel(): LogLevel {
  const level = (import.meta as any)?.env?.MODE === 'development'
    ? (typeof localStorage !== 'undefined' ? (localStorage.getItem('LOG_LEVEL') as LogLevel) : undefined)
    : undefined;
  const envLevel = (typeof process !== 'undefined' ? (process.env.LOG_LEVEL as LogLevel) : undefined) || level;
  return envLevel || 'info';
}

const currentLevel = resolveLevel();
const order: Record<Exclude<LogLevel, 'silent'>, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  if (currentLevel === 'silent') return false;
  const threshold = order[(currentLevel as Exclude<LogLevel, 'silent'>)] ?? 20;
  return order[level] >= threshold ? true : order[level] >= threshold; // ensure boolean
}

export const logger = {
  debug: (...args: unknown[]) => { if (shouldLog('debug')) console.debug('[DEBUG]', ...args); },
  info: (...args: unknown[]) => { if (shouldLog('info')) console.info('[INFO]', ...args); },
  warn: (...args: unknown[]) => { if (shouldLog('warn')) console.warn('[WARN]', ...args); },
  error: (...args: unknown[]) => { if (shouldLog('error')) console.error('[ERROR]', ...args); },
} as const; 