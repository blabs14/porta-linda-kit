// Script para diagnosticar problemas de refresh token

console.log('🔍 Diagnóstico de Refresh Token - Supabase');
console.log('=' .repeat(50));

// Verificar localStorage para tokens Supabase
const supabaseKeys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && /^(sb-|supabase\.)/i.test(key)) {
    supabaseKeys.push(key);
  }
}

console.log('📦 Chaves Supabase no localStorage:', supabaseKeys.length);
supabaseKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`  - ${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
  
  // Tentar fazer parse se parecer JSON
  if (value && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      console.log(`    📋 Estrutura:`, {
        hasAccessToken: !!parsed.access_token,
        hasRefreshToken: !!parsed.refresh_token,
        expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'N/A',
        tokenType: parsed.token_type,
        user: parsed.user ? `${parsed.user.email} (${parsed.user.id})` : 'N/A'
      });
      
      // Verificar se o token expirou
      if (parsed.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now > parsed.expires_at;
        console.log(`    ⏰ Token expirado: ${isExpired ? '❌ SIM' : '✅ NÃO'} (${isExpired ? now - parsed.expires_at : parsed.expires_at - now}s)`);
      }
    } catch (e) {
      console.log(`    ❌ Erro ao fazer parse: ${e.message}`);
    }
  }
});

// Verificar variáveis de ambiente
console.log('\n🌍 Variáveis de Ambiente:');
const envVars = {
  VITE_SUPABASE_URL: import.meta?.env?.VITE_SUPABASE_URL || 'N/A',
  VITE_SUPABASE_ANON_KEY: import.meta?.env?.VITE_SUPABASE_ANON_KEY ? '[PRESENTE]' : 'N/A'
};

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  - ${key}: ${value}`);
});

// Verificar se estamos em desenvolvimento
console.log('\n🔧 Ambiente:');
console.log(`  - Modo: ${import.meta?.env?.DEV ? 'Desenvolvimento' : 'Produção'}`);
console.log(`  - URL atual: ${window.location.href}`);

// Sugestões de resolução
console.log('\n💡 Possíveis Soluções:');
console.log('1. Limpar localStorage e fazer login novamente');
console.log('2. Verificar se o refresh token não foi corrompido');
console.log('3. Verificar conectividade com Supabase');
console.log('4. Verificar se o projeto Supabase está ativo');

// Função para limpar tokens
window.clearSupabaseTokens = () => {
  console.log('🧹 Limpando tokens Supabase...');
  supabaseKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  ✅ Removido: ${key}`);
  });
  console.log('✅ Tokens limpos. Recarregue a página e faça login novamente.');
};

console.log('\n🔧 Para limpar tokens: clearSupabaseTokens()');
console.log('=' .repeat(50));