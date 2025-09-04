export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

function readModeFromImportMeta(): string | undefined {
  try {
    const meta = import.meta as unknown as { env?: { MODE?: string } };
    return meta?.env?.MODE;
  } catch {
    return undefined;
  }
}

function resolveLevel(): LogLevel {
  let level: LogLevel | undefined;
  const mode = readModeFromImportMeta();
  if (mode === 'development' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('LOG_LEVEL') as LogLevel | null;
    level = stored ?? undefined;
  }
  if (!level && typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    const fromEnv = process.env.LOG_LEVEL as LogLevel | undefined;
    level = fromEnv;
  }
  return level || 'info';
}

const currentLevel = resolveLevel();
const order: Record<Exclude<LogLevel, 'silent'>, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  if (currentLevel === 'silent') return false;
  const threshold = order[(currentLevel as Exclude<LogLevel, 'silent'>)] ?? 20;
  return order[level] >= threshold;
}

export const logger = {
  debug: (...args: unknown[]) => { if (shouldLog('debug')) console.debug('[DEBUG]', ...args); },
  info: (...args: unknown[]) => { if (shouldLog('info')) console.info('[INFO]', ...args); },
  warn: (...args: unknown[]) => { if (shouldLog('warn')) console.warn('[WARN]', ...args); },
  error: (...args: unknown[]) => { if (shouldLog('error')) console.error('[ERROR]', ...args); },
} as const;

export type LogMeta = Record<string, unknown>;

// Cria um logger com contexto fixo (ex.: { feature: 'payroll', component: 'X' })
export function withContext(meta: LogMeta) {
  return {
    debug: (...args: unknown[]) => logger.debug(meta, ...args),
    info: (...args: unknown[]) => logger.info(meta, ...args),
    warn: (...args: unknown[]) => logger.warn(meta, ...args),
    error: (...args: unknown[]) => logger.error(meta, ...args),
  } as const;
}

// Mascarar IDs para logs (mostra apenas os últimos dígitos)
export function maskId(id: string | number | null | undefined, visible: number = 4): string | null {
  if (id === null || id === undefined) return null;
  const s = String(id);
  if (s.length <= visible) return s;
  return '***' + s.slice(-visible);
}