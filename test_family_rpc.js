import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

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