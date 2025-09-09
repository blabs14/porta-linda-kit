import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContracts() {
  try {
    console.log('🔍 Verificando contratos na base de dados...');
    
    // Verificar todos os contratos
    const { data: allContracts, error: allError } = await supabase
      .from('payroll_contracts')
      .select('*');
    
    if (allError) {
      console.error('❌ Erro ao buscar todos os contratos:', allError);
      return;
    }
    
    console.log('📋 Todos os contratos:', allContracts?.length || 0);
    allContracts?.forEach(contract => {
      console.log(`  - ID: ${contract.id}, Nome: ${contract.name}, Ativo: ${contract.is_active}, User: ${contract.user_id}`);
    });
    
    // Verificar contratos ativos
    const { data: activeContracts, error: activeError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('is_active', true);
    
    if (activeError) {
      console.error('❌ Erro ao buscar contratos ativos:', activeError);
      return;
    }
    
    console.log('\n✅ Contratos ativos:', activeContracts?.length || 0);
    activeContracts?.forEach(contract => {
      console.log(`  - ID: ${contract.id}, Nome: ${contract.name}, User: ${contract.user_id}`);
    });
    
    // Verificar utilizadores
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('⚠️ Não foi possível listar utilizadores (permissões limitadas)');
    } else {
      console.log('\n👥 Utilizadores encontrados:', users?.users?.length || 0);
      users?.users?.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testContracts();