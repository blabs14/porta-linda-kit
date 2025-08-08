// Serviço base para integrações externas
// Exemplo de uso: importar/exportar dados de bancos, faturas, etc.

export interface ExternalApiError {
  message: string;
  status?: number;
}

export async function fetchExternalApi<TResponse = unknown>(
  url: string,
  options?: RequestInit
): Promise<TResponse> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = `Erro ao comunicar com API externa (${response.status})`;
    throw new Error(message);
  }
  return (await response.json()) as TResponse;
}

// Exemplo de função para importar dados de um banco externo
export interface BankTransactionDTO {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export const importBankTransactions = async (
  bankApiUrl: string,
  token: string
) => {
  return fetchExternalApi<BankTransactionDTO[]>(bankApiUrl + '/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Exemplo de função para exportar faturas
export interface InvoiceItemDTO {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceDTO {
  id?: string;
  customerName: string;
  customerTaxId?: string;
  issueDate: string;
  items: InvoiceItemDTO[];
  currency?: string;
  notes?: string;
}

export interface InvoiceExportResponse {
  invoiceId: string;
  status: 'created' | 'queued' | 'failed';
}

export const exportInvoices = async (
  invoicesApiUrl: string,
  data: InvoiceDTO,
  token: string
) => {
  return fetchExternalApi<InvoiceExportResponse>(invoicesApiUrl + '/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}; 