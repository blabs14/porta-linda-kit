// Teste com output direto no DOM
export const testDomOutput = async () => {
  // Criar elemento para mostrar resultados
  const testDiv = document.createElement('div');
  testDiv.id = 'test-results';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #000;
    color: #0f0;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 9999;
    border: 1px solid #0f0;
  `;
  document.body.appendChild(testDiv);
  
  const log = (message: string) => {
    console.log(message);
    testDiv.innerHTML += message + '<br>';
  };
  
  log('=== TESTE DE CONECTIVIDADE ===');
  
  try {
    // Verificar variáveis de ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    log(`URL Supabase: ${supabaseUrl ? 'PRESENTE' : 'AUSENTE'}`);
    log(`Anon Key: ${anonKey ? 'PRESENTE' : 'AUSENTE'}`);
    
    if (!supabaseUrl || !anonKey) {
      log('ERRO: Variáveis de ambiente em falta!');
      return;
    }
    
    // Teste 1: httpbin.org
    log('Teste 1: httpbin.org...');
    try {
      const response1 = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      log(`httpbin.org: ${response1.status} ${response1.statusText}`);
    } catch (error) {
      log(`httpbin.org ERRO: ${error}`);
    }
    
    // Teste 2: Supabase base URL
    log('Teste 2: Supabase base...');
    try {
      const response2 = await fetch(supabaseUrl, {
        method: 'GET'
      });
      log(`Supabase base: ${response2.status} ${response2.statusText}`);
    } catch (error) {
      log(`Supabase base ERRO: ${error}`);
    }
    
    // Teste 3: Supabase API
    log('Teste 3: Supabase API...');
    try {
      const apiUrl = `${supabaseUrl}/rest/v1/notifications?limit=1`;
      const response3 = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      log(`Supabase API: ${response3.status} ${response3.statusText}`);
      
      if (response3.ok) {
        const data = await response3.json();
        log(`Dados: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        const errorText = await response3.text();
        log(`Erro API: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      log(`Supabase API ERRO: ${error}`);
    }
    
  } catch (error) {
    log(`ERRO GERAL: ${error}`);
  }
  
  log('=== FIM DO TESTE ===');
};