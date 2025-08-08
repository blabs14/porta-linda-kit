import { createClient } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/database.types';

const env = (import.meta as any).env ?? {};
const supabaseUrl = (env.VITE_SUPABASE_URL as string) || (process.env.VITE_SUPABASE_URL as string) || 'http://localhost:54321';
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY as string) || (process.env.VITE_SUPABASE_ANON_KEY as string) || 'test-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);