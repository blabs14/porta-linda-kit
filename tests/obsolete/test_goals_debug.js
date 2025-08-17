const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoalCreation() {
  console.log('🔍 Testando criação de objetivo...');
  
  try {
    // Testar inserção de objetivo
    const testGoal = {
      nome: 'Teste Debug',
      valor_objetivo: 1000,
      prazo: '2025-12-31',
      user_id: '017a5ae9-3ac6-4866-b9e6-e364c9c4ecf6'
    };
    
    console.log('Tentando inserir objetivo:', testGoal);
    
    const { data, error } = await supabase
      .from('goals')
      .insert(testGoal)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar objetivo:', error);
    } else {
      console.log('✅ Objetivo criado com sucesso:', data);
      
      // Eliminar o objetivo de teste
      await supabase
        .from('goals')
        .delete()
        .eq('id', data.id);
      
      console.log('✅ Objetivo de teste eliminado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testGoalCreation(); 