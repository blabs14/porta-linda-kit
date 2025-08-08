import { createClient } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/database.types';

interface ImportMetaEnvVars {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

// Vite expõe import.meta.env; em testes, pode não existir e recorremos a process.env
const viteEnv: ImportMetaEnvVars = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: ImportMetaEnvVars }).env) || {};

const supabaseUrl = viteEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);