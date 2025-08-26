// Teste simples de conectividade
export const testSimpleFetch = async () => {
  console.log('=== TESTE SIMPLES DE FETCH ===');
  
  try {
    // Teste 1: Requisição para um serviço externo conhecido
    console.log('Teste 1: Requisição para httpbin.org...');
    const response1 = await fetch('https://httpbin.org/get');
    console.log('Resposta httpbin:', response1.status, response1.statusText);
    
    // Teste 2: Requisição para o domínio Supabase (sem API)
    console.log('Teste 2: Requisição para domínio Supabase...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log('URL Supabase:', supabaseUrl);
    
    if (supabaseUrl) {
      const response2 = await fetch(supabaseUrl);
      console.log('Resposta Supabase (base):', response2.status, response2.statusText);
    }
    
    // Teste 3: Requisição para API REST do Supabase
    console.log('Teste 3: Requisição para API REST Supabase...');
    const apiUrl = `${supabaseUrl}/rest/v1/notifications`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('API URL:', apiUrl);
    console.log('Anon Key presente:', !!anonKey);
    
    const response3 = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Resposta API Supabase:', response3.status, response3.statusText);
    
    if (response3.ok) {
      const data = await response3.json();
      console.log('Dados recebidos:', data);
    } else {
      console.log('Erro na resposta:', await response3.text());
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
    console.error('Tipo do erro:', typeof error);
    console.error('Nome do erro:', error instanceof Error ? error.name : 'Desconhecido');
    console.error('Mensagem do erro:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('=== FIM DO TESTE ===');
};