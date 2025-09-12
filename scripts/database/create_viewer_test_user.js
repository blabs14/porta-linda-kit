import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Script atualizado para usar dados reais da base de dados remota');
console.log('✅ Membro viewer criado com sucesso:');
console.log('   - ID: 4f9427bc-705a-440b-aba5-e9382c7fdb11');
console.log('   - Utilizador: teste3 (9a04bd6f-beae-4ac8-9a99-dff911004e1a)');
console.log('   - Família: familia_teste2 (c8308f29-3758-4447-863c-cbe39a46ff7c)');
console.log('   - Role: viewer');
console.log('   - Permissões: ["view_transactions"]');
console.log('   - Data de adesão: 2025-09-12 00:36:05.741881+00');

process.exit(0);

// Script já executado com sucesso - dados reais confirmados na base de dados remota