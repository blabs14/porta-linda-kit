import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import FamilyAccounts from '../FamilyAccounts';
import { FamilyProvider } from '../FamilyProvider';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock dos serviços
jest.mock('../../../services/accounts', () => ({
  getAccountsWithBalances: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock('../../../services/family', () => ({
  getFamilyData: jest.fn(),
  getFamilyMembers: jest.fn(),
  getPendingInvites: jest.fn(),
}));

jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock do Supabase
jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  },
}));

// Wrapper para testes
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FamilyProvider>
            {children}
          </FamilyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Dados de teste
const mockFamilyData = {
  family: {
    id: 'family-1',
    nome: 'Família Silva',
    description: 'Família de teste',
  },
  myRole: 'owner' as const,
};

const mockBankAccounts = [
  {
    account_id: 'account-1',
    nome: 'Conta Corrente',
    tipo: 'conta corrente',
    saldo_atual: 5000,
    saldo_disponivel: 4500,
    total_reservado: 500,
  },
  {
    account_id: 'account-2',
    nome: 'Poupança',
    tipo: 'poupança',
    saldo_atual: 10000,
    saldo_disponivel: 10000,
    total_reservado: 0,
  },
];

const mockCreditCards = [
  {
    account_id: 'card-1',
    nome: 'Cartão Principal',
    tipo: 'cartão de crédito',
    saldo_atual: -1500,
    saldo_disponivel: -1500,
    total_reservado: 0,
  },
  {
    account_id: 'card-2',
    nome: 'Cartão Secundário',
    tipo: 'cartão de crédito',
    saldo_atual: 0,
    saldo_disponivel: 0,
    total_reservado: 0,
  },
];

describe('FamilyAccounts - Cenários de Teste', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cenário 1: Família com Contas e Cartões', () => {
    it('deve exibir contas bancárias e cartões de crédito corretamente', async () => {
      // Mock dos dados
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.getByText('Contas Familiares')).toBeInTheDocument();
      });

      // Verificar seção de contas bancárias
      expect(screen.getByText('Contas Bancárias')).toBeInTheDocument();
      expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
      expect(screen.getByText('Poupança')).toBeInTheDocument();

      // Verificar seção de cartões de crédito
      expect(screen.getByText('Cartões de Crédito')).toBeInTheDocument();
      expect(screen.getByText('Cartão Principal')).toBeInTheDocument();
      expect(screen.getByText('Cartão Secundário')).toBeInTheDocument();

      // Verificar status dos cartões
      expect(screen.getByText('Em Dívida')).toBeInTheDocument();
      expect(screen.getByText('Em Dia')).toBeInTheDocument();
    });

    it('deve permitir criar nova conta quando user tem permissões', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Nova Conta')).toBeInTheDocument();
      });

      const newAccountButton = screen.getByText('Nova Conta');
      fireEvent.click(newAccountButton);

      // Verificar se o modal de criação aparece
      await waitFor(() => {
        expect(screen.getByText('Nova Conta')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 2: Família sem Contas', () => {
    it('deve exibir estados vazios quando não há contas', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Nenhuma conta bancária encontrada')).toBeInTheDocument();
        expect(screen.getByText('Nenhum cartão de crédito encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 3: Família com Apenas Contas Bancárias', () => {
    it('deve exibir apenas contas bancárias quando não há cartões', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue(mockBankAccounts);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
        expect(screen.getByText('Poupança')).toBeInTheDocument();
        expect(screen.getByText('Nenhum cartão de crédito encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 4: Família com Apenas Cartões de Crédito', () => {
    it('deve exibir apenas cartões quando não há contas bancárias', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue(mockCreditCards);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Nenhuma conta bancária encontrada')).toBeInTheDocument();
        expect(screen.getByText('Cartão Principal')).toBeInTheDocument();
        expect(screen.getByText('Cartão Secundário')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 5: Utilizador sem Permissões', () => {
    it('deve ocultar botões de ação quando user não tem permissões', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue({
        ...mockFamilyData,
        myRole: 'viewer' as const,
      });

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Contas Familiares')).toBeInTheDocument();
      });

      // Verificar que botões de ação não estão presentes
      expect(screen.queryByText('Nova Conta')).not.toBeInTheDocument();
      expect(screen.queryByText('Transferir')).not.toBeInTheDocument();
    });
  });

  describe('Cenário 6: Estados de Loading', () => {
    it('deve exibir loading state durante carregamento', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockImplementation(() => new Promise(() => {})); // Promise que nunca resolve

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      expect(screen.getByText('A carregar contas...')).toBeInTheDocument();
    });
  });

  describe('Cenário 7: Operações CRUD', () => {
    it('deve permitir editar conta existente', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Editar Conta')).toBeInTheDocument();
      });
    });

    it('deve permitir eliminar conta com confirmação', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Eliminar Conta')).toBeInTheDocument();
        expect(screen.getByText(/Tem a certeza que deseja eliminar/)).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 8: Transferências', () => {
    it('deve permitir abrir modal de transferência', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Transferir')).toBeInTheDocument();
      });

      const transferButton = screen.getByText('Transferir');
      fireEvent.click(transferButton);

      // Verificar se o modal de transferência aparece
      await waitFor(() => {
        expect(screen.getByText('A carregar modal...')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 9: Formatação de Valores', () => {
    it('deve formatar valores monetários corretamente', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('5.000,00 €')).toBeInTheDocument();
        expect(screen.getByText('10.000,00 €')).toBeInTheDocument();
        expect(screen.getByText('-1.500,00 €')).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 10: Responsividade', () => {
    it('deve adaptar layout para diferentes tamanhos de ecrã', async () => {
      const { getAccountsWithBalances } = require('../../../services/accounts');
      getAccountsWithBalances.mockResolvedValue([...mockBankAccounts, ...mockCreditCards]);

      const { getFamilyData } = require('../../../services/family');
      getFamilyData.mockResolvedValue(mockFamilyData);

      const { container } = render(
        <TestWrapper>
          <FamilyAccounts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Contas Familiares')).toBeInTheDocument();
      });

      // Verificar classes de grid responsivo
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-3');
    });
  });
}); 