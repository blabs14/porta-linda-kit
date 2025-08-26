import { supabase } from './lib/supabaseClient';

// Teste simples de conectividade
export async function testSupabaseConnection() {
  console.log('🧪 Testando conectividade Supabase...');
  
  try {
    // Teste básico de conectividade
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    console.log('✅ Conectividade OK:', { data, error });
    return { success: true, data, error };
  } catch (err) {
    console.error('❌ Erro de conectividade:', err);
    return { success: false, error: err };
  }
}

// Executar teste automaticamente
testSupabaseConnection();