import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = `test_${Math.random().toString(36).substring(2, 10)}@test.com`;
  const password = 'password123';
  const nome = 'Teste Script Node';

  // Registo
  const signupRes = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome } }
  });
  console.log('[SIGNUP] Payload:', { email, password, nome });
  console.log('[SIGNUP] Resposta:', signupRes);

  // Login
  const loginRes = await supabase.auth.signInWithPassword({ email, password });
  console.log('[LOGIN] Payload:', { email, password });
  console.log('[LOGIN] Resposta:', loginRes);
}

main();