import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFamilyPage() {
  console.log('🔍 Testando página de família...');
  
  try {
    // 1. Verificar se há um utilizador autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️ Nenhum utilizador autenticado');
      console.log('💡 Tentando fazer login com credenciais de teste...');
      
      // Tentar fazer login (ler de env)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      
      if (signInError) {
        console.error('❌ Erro no login:', signInError);
        return;
      }
      
      console.log('✅ Login bem-sucedido:', signInData.user.email);
    } else {
      console.log('✅ Utilizador já autenticado:', user.email);
    }
    
    // 2. Testar a função RPC
    console.log('🔍 Testando função RPC get_user_family_data...');
    const { data, error } = await supabase.rpc('get_user_family_data');
    
    if (error) {
      console.error('❌ Erro na função RPC:', error);
      return;
    }
    
    console.log('✅ Função RPC executada com sucesso');
    console.log('📊 Dados retornados:', JSON.stringify(data, null, 2));
    
    if (data === null) {
      console.log('💡 O utilizador não tem uma família associada');
      console.log('💡 Isto é normal se o utilizador ainda não criou uma família');
    } else {
      console.log('✅ Utilizador tem uma família associada');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testFamilyPage(); 