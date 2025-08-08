const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoalsTables() {
  console.log('🔍 Testando tabelas de objetivos...');
  
  try {
    // Testar se a tabela goals existe
    console.log('\n1. Verificando tabela goals...');
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .limit(1);
    
    if (goalsError) {
      console.error('❌ Erro ao aceder à tabela goals:', goalsError);
    } else {
      console.log('✅ Tabela goals acessível');
    }
    
    // Testar se a tabela goal_allocations existe
    console.log('\n2. Verificando tabela goal_allocations...');
    const { data: allocations, error: allocationsError } = await supabase
      .from('goal_allocations')
      .select('*')
      .limit(1);
    
    if (allocationsError) {
      console.error('❌ Erro ao aceder à tabela goal_allocations:', allocationsError);
    } else {
      console.log('✅ Tabela goal_allocations acessível');
    }
    
    // Testar se a tabela transactions tem a coluna goal_id
    console.log('\n3. Verificando coluna goal_id na tabela transactions...');
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (transactionsError) {
      console.error('❌ Erro ao aceder à tabela transactions:', transactionsError);
    } else {
      console.log('✅ Tabela transactions acessível');
      if (transactions && transactions.length > 0) {
        const hasGoalId = 'goal_id' in transactions[0];
        console.log(`   Coluna goal_id: ${hasGoalId ? '✅ Presente' : '❌ Ausente'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testGoalsTables(); 