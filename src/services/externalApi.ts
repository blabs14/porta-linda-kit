// Serviço base para integrações externas
// Exemplo de uso: importar/exportar dados de bancos, faturas, etc.

export const fetchExternalApi = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Erro ao comunicar com API externa');
  return response.json();
};

// Exemplo de função para importar dados de um banco externo
export const importBankTransactions = async (bankApiUrl: string, token: string) => {
  return fetchExternalApi(bankApiUrl + '/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Exemplo de função para exportar faturas
export const exportInvoices = async (invoicesApiUrl: string, data: any, token: string) => {
  return fetchExternalApi(invoicesApiUrl + '/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}; 