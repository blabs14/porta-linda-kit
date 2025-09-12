// Script de teste para verificar carregamento de contratos
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usando as credenciais reais)
const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Função de teste
async function testContractLoading() {
  console.log('🧪 Teste de carregamento de contratos');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key (primeiros 20 chars):', supabaseKey.substring(0, 20) + '...');
  
  try {
    // Teste 1: Verificar conectividade
    console.log('\n1️⃣ Testando conectividade...');
    const { data: testData, error: testError } = await supabase
      .from('payroll_contracts')
      .select('*', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Erro de conectividade:', testError);
      return;
    }
    
    console.log('✅ Conectividade OK');
    
    // Teste 2: Verificar estrutura da tabela
    console.log('\n2️⃣ Verificando estrutura da tabela...');
    const { data: tableData, error: tableError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erro ao verificar tabela:', tableError);
      return;
    }
    
    console.log('✅ Tabela acessível');
    console.log('📊 Exemplo de estrutura:', tableData?.[0] ? Object.keys(tableData[0]) : 'Tabela vazia');
    
    // Teste 3: Contar registos totais
    console.log('\n3️⃣ Contando registos totais...');
    const { count, error: countError } = await supabase
      .from('payroll_contracts')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar:', countError);
      return;
    }
    
    console.log('📈 Total de contratos na base de dados:', count);
    
    // Teste 4: Verificar autenticação atual
    console.log('\n4️⃣ Verificando autenticação...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
    } else if (user) {
      console.log('✅ Utilizador autenticado:', user.id);
      
      // Teste 5: Buscar contratos do utilizador
      console.log('\n5️⃣ Buscando contratos do utilizador...');
      const { data: userContracts, error: userError } = await supabase
        .from('payroll_contracts')
        .select('*')
        .eq('user_id', user.id);
      
      if (userError) {
        console.error('❌ Erro ao buscar contratos do utilizador:', userError);
      } else {
        console.log('✅ Contratos encontrados:', userContracts?.length || 0);
        if (userContracts && userContracts.length > 0) {
          console.log('📋 Primeiro contrato:', {
            id: userContracts[0].id,
            name: userContracts[0].name,
            is_active: userContracts[0].is_active
          });
        }
      }
    } else {
      console.log('⚠️ Nenhum utilizador autenticado');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar teste
testContractLoading().then(() => {
  console.log('\n🏁 Teste concluído');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});