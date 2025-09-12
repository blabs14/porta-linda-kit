// Script de teste para verificar carregamento de contratos com autenticação
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Credenciais de teste
const testEmail = 'teste2@teste';
const testPassword = 'teste14';

// Função de teste com autenticação
async function testAuthenticatedContractLoading() {
  console.log('🧪 Teste de carregamento de contratos com autenticação');
  console.log('📧 Email de teste:', testEmail);
  
  try {
    // Passo 1: Fazer login
    console.log('\n1️⃣ Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }
    
    console.log('✅ Login bem-sucedido');
    console.log('👤 User ID:', authData.user?.id);
    console.log('📧 Email:', authData.user?.email);
    
    // Passo 2: Verificar sessão
    console.log('\n2️⃣ Verificando sessão...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('🔑 Sessão ativa:', !!sessionData.session);
    console.log('👤 User ID da sessão:', sessionData.session?.user?.id);
    
    // Passo 3: Testar carregamento de contratos
    console.log('\n3️⃣ Carregando contratos...');
    const { data: contracts, error: contractsError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (contractsError) {
      console.error('❌ Erro ao carregar contratos:', contractsError.message);
      console.error('🔍 Detalhes do erro:', contractsError);
      return;
    }
    
    console.log('✅ Contratos carregados com sucesso');
    console.log('📊 Número de contratos:', contracts?.length || 0);
    
    if (contracts && contracts.length > 0) {
      console.log('\n📋 Contratos encontrados:');
      contracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. ${contract.name} (ID: ${contract.id})`);
        console.log(`     User ID: ${contract.user_id}`);
        console.log(`     Ativo: ${contract.is_active}`);
        console.log(`     Criado: ${contract.created_at}`);
      });
    } else {
      console.log('📭 Nenhum contrato encontrado para este utilizador');
    }
    
    // Passo 4: Verificar contrato ativo
    console.log('\n4️⃣ Verificando contrato ativo...');
    const { data: activeContracts, error: activeError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (activeError) {
      console.error('❌ Erro ao verificar contratos ativos:', activeError.message);
    } else {
      console.log('✅ Contratos ativos:', activeContracts?.length || 0);
      if (activeContracts && activeContracts.length > 0) {
        console.log('🎯 Contrato ativo principal:', activeContracts[0].name);
      }
    }
    
    // Passo 5: Logout
    console.log('\n5️⃣ Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado');
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar teste
testAuthenticatedContractLoading().then(() => {
  console.log('\n🏁 Teste concluído');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});