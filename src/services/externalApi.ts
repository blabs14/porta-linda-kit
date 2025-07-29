// Serviço base para integrações externas
// Exemplo de uso: importar/exportar dados de bancos, faturas, etc.

export const fetchExternalApi = async (url: string, options?: RequestInit): Promise<{ data: any | null; error: any }> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { data: null, error: new Error('Erro ao comunicar com API externa') };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Exemplo de função para importar dados de um banco externo
export const importBankTransactions = async (bankApiUrl: string, token: string): Promise<{ data: any | null; error: any }> => {
  return fetchExternalApi(bankApiUrl + '/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Exemplo de função para exportar faturas
export const exportInvoices = async (invoicesApiUrl: string, data: any, token: string): Promise<{ data: any | null; error: any }> => {
  return fetchExternalApi(invoicesApiUrl + '/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}; 