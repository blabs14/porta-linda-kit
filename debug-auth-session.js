// Debug script para verificar estado de autenticação
import { supabase } from './src/lib/supabaseClient.js';

async function debugAuthSession() {
  console.log('🔍 Debug: Verificando estado de autenticação...');
  
  try {
    // 1. Verificar sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Sessão atual:', {
      hasSession: !!session,
      userId: session?.user?.id,
      accessToken: session?.access_token ? 'presente' : 'ausente',
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
      error: sessionError
    });
    
    // 2. Verificar utilizador atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Utilizador atual:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError
    });
    
    // 3. Testar acesso à tabela payroll_contracts
    console.log('🧪 Testando acesso à tabela payroll_contracts...');
    const { data, error, count } = await supabase
      .from('payroll_contracts')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log('📊 Resultado do teste:', {
      success: !error,
      error: error?.message,
      dataCount: data?.length || 0,
      totalCount: count,
      errorCode: error?.code,
      errorDetails: error?.details
    });
    
    // 4. Verificar headers da requisição
    if (session?.access_token) {
      console.log('🔑 Token de acesso presente, testando com header manual...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/payroll_contracts?select=*&limit=1`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🌐 Resposta HTTP:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Erro HTTP:', errorText);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro durante debug:', error);
  }
}

// Executar debug
debugAuthSession();