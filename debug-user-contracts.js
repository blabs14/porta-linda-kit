import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserContracts() {
  console.log('🔍 Debug: Contratos do utilizador teste2@teste');
  console.log('=' .repeat(50));
  
  try {
    // 1. Usar ID do utilizador teste2@teste conhecido
    console.log('\n1. Verificando utilizador teste2@teste...');
    const userId = '3007cf41-5693-4bbd-a44c-047a80a10595';
    console.log('✅ Utilizador ID:', userId);
    
    const user = { id: userId, email: 'teste2@teste' };
    
    // 2. Buscar contratos do utilizador
    console.log('\n2. Buscando contratos do utilizador...');
    const { data: contracts, error: contractsError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (contractsError) {
      console.error('❌ Erro ao buscar contratos:', contractsError.message);
      return;
    }
    
    console.log(`✅ Encontrados ${contracts?.length || 0} contratos:`);
    if (contracts && contracts.length > 0) {
      contracts.forEach((contract, index) => {
        console.log(`\n   Contrato ${index + 1}:`);
        console.log(`   - ID: ${contract.id}`);
        console.log(`   - Nome: ${contract.name}`);
        console.log(`   - Ativo: ${contract.is_active ? 'Sim' : 'Não'}`);
        console.log(`   - Salário Base: €${contract.base_salary}`);
        console.log(`   - Criado em: ${contract.created_at}`);
      });
    } else {
      console.log('   Nenhum contrato encontrado.');
    }
    
    // 3. Verificar contratos ativos especificamente
    console.log('\n3. Verificando contratos ativos...');
    const { data: activeContracts, error: activeError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (activeError) {
      console.error('❌ Erro ao buscar contratos ativos:', activeError.message);
      return;
    }
    
    console.log(`✅ Contratos ativos: ${activeContracts?.length || 0}`);
    if (activeContracts && activeContracts.length > 0) {
      activeContracts.forEach((contract, index) => {
        console.log(`\n   Contrato Ativo ${index + 1}:`);
        console.log(`   - ID: ${contract.id}`);
        console.log(`   - Nome: ${contract.name}`);
        console.log(`   - Salário Base: €${contract.base_salary}`);
      });
    }
    
    // 4. Verificar localStorage (simulação)
    console.log('\n4. Informações de debug adicionais:');
    console.log(`   - URL Supabase: ${supabaseUrl}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Total de contratos: ${contracts?.length || 0}`);
    console.log(`   - Contratos ativos: ${activeContracts?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar debug
debugUserContracts().then(() => {
  console.log('\n🏁 Debug concluído');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});