import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

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