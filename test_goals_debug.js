const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NzI5NzQsImV4cCI6MjA0NzU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

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