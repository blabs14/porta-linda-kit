// Teste direto com fetch para verificar conectividade
export const testDirectFetch = async () => {
  console.log('🧪 Testando conectividade direta com fetch...');
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🧪 Configuração:', {
    url,
    hasKey: !!key,
    keyLength: key?.length
  });
  
  if (!url || !key) {
    console.error('🧪 Variáveis de ambiente não encontradas');
    return;
  }
  
  try {
    const response = await fetch(`${url}/rest/v1/notifications?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 Resposta fetch:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🧪 Dados recebidos:', data);
    } else {
      const errorText = await response.text();
      console.error('🧪 Erro na resposta:', errorText);
    }
  } catch (error) {
    console.error('🧪 Erro no fetch:', error);
  }
};