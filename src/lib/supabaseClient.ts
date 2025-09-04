import { createClient } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/database.types';

// Em desenvolvimento, remover sessões antigas antes de inicializar o cliente
try {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      if (/^(sb-|supabase\.)/i.test(k)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  }
} catch {}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Preferir erro claro no console sem expor segredos
  // eslint-disable-next-line no-console
  console.error('[Supabase] Variáveis de ambiente em falta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('🔧 Supabase inicializado (dev). URL presente:', !!supabaseUrl, 'AnonKey length:', supabaseAnonKey?.length);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});