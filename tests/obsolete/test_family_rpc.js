import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFamilyRPC() {
  console.log('🔍 Testando função RPC get_user_family_data...');
  
  try {
    // Verificar se há um utilizador autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️ Nenhum utilizador autenticado');
      console.log('💡 A função RPC retorna null quando não há utilizador autenticado');
      return;
    }
    
    console.log('✅ Utilizador autenticado:', user.email);
    
    // Testar a função RPC
    const { data, error } = await supabase.rpc('get_user_family_data');
    
    if (error) {
      console.error('❌ Erro na função RPC:', error);
      return;
    }
    
    console.log('✅ Função RPC executada com sucesso');
    console.log('📊 Dados retornados:', JSON.stringify(data, null, 2));
    
    if (data === null) {
      console.log('💡 O utilizador não tem uma família associada');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testFamilyRPC(); 