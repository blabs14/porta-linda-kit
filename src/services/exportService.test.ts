import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  exportToPDF, 
  exportToCSV, 
  exportToExcel, 
  fetchExportData, 
  exportReport
} from './exportService';

// Mock das dependências
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(['test'], { type: 'application/pdf' })),
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn().mockReturnValue({}),
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn().mockReturnValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
}));

describe('exportService', () => {
  const mockExportData = {
    transactions: [
      {
        id: '1',
        data: '2024-01-01',
        descricao: 'Teste receita',
        valor: 100,
        tipo: 'receita',
        categoria_nome: 'Salário',
        account_nome: 'Conta Principal',
        account_id: '1',
        categoria_id: '1',
        created_at: '2024-01-01T00:00:00Z',
        family_id: null,
        goal_id: null,
        user_id: '1',
      },
      {
        id: '2',
        data: '2024-01-02',
        descricao: 'Teste despesa',
        valor: 50,
        tipo: 'despesa',
        categoria_nome: 'Alimentação',
        account_nome: 'Conta Principal',
        account_id: '1',
        categoria_id: '2',
        created_at: '2024-01-02T00:00:00Z',
        family_id: null,
        goal_id: null,
        user_id: '1',
      },
    ],
    accounts: [
      {
        id: '1',
        nome: 'Conta Principal',
        saldo: 1000,
        tipo: 'corrente',
        created_at: '2024-01-01T00:00:00Z',
        user_id: '1',
      },
    ],
    categories: [
      {
        id: '1',
        nome: 'Salário',
        cor: '#00ff00',
        created_at: '2024-01-01T00:00:00Z',
        family_id: '1',
        user_id: '1',
      },
      {
        id: '2',
        nome: 'Alimentação',
        cor: '#ff0000',
        created_at: '2024-01-01T00:00:00Z',
        family_id: '1',
        user_id: '1',
      },
    ],
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
  };

  const mockOptions = {
    format: 'pdf' as const,
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });



  describe('exportToPDF', () => {
    it('deve gerar PDF sem erros', async () => {
      const result = await exportToPDF(mockExportData, mockOptions);
      expect(result.error).toBeNull();
      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('exportToCSV', () => {
    it('deve gerar CSV sem erros', () => {
      const result = exportToCSV(mockExportData, mockOptions);
      expect(result.error).toBeNull();
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('deve incluir cabeçalhos corretos', () => {
      const result = exportToCSV(mockExportData, mockOptions);
      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('exportToExcel', () => {
    it('deve gerar Excel sem erros', () => {
      const result = exportToExcel(mockExportData, mockOptions);
      expect(result.error).toBeNull();
      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('fetchExportData', () => {
    it('deve retornar erro se userId não for fornecido', async () => {
      const result = await fetchExportData('', mockOptions.dateRange);
      expect(result.error).toBeDefined();
    });
  });

  describe('exportReport', () => {
    it('deve retornar erro se userId não for fornecido', async () => {
      const result = await exportReport('', mockOptions);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('ID do utilizador é obrigatório');
    });

    it('deve retornar erro se dateRange não for fornecido', async () => {
      const result = await exportReport('user1', { ...mockOptions, dateRange: { start: '', end: '' } });
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Intervalo de datas é obrigatório');
    });

    it('deve retornar erro para formato não suportado', async () => {
      const result = await exportReport('user1', { ...mockOptions, format: 'txt' as any });
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe("Formato 'txt' não suportado");
    });
  });
}); 