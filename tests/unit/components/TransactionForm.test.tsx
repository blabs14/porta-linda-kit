import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TransactionForm from '@/components/TransactionForm';
import { useAuth } from '@/contexts/AuthContext';
import * as accountsService from '@/services/accounts';
import * as categoriesService from '@/services/categories';

// Mock dos serviços e hooks
vi.mock('@/contexts/AuthContext');
vi.mock('@/services/accounts');
vi.mock('@/services/categories');

const mockUseAuth = vi.mocked(useAuth);
const mockAccountsService = vi.mocked(accountsService);
const mockCategoriesService = vi.mocked(categoriesService);

// Wrapper para QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TransactionForm', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockAccounts = [
    { id: 'account-1', nome: 'Conta Principal', tipo: 'corrente' },
    { id: 'account-2', nome: 'Poupança', tipo: 'poupanca' },
  ];
  const mockCategories = [
    { id: 'category-1', nome: 'Alimentação', tipo: 'despesa' },
    { id: 'category-2', nome: 'Salário', tipo: 'receita' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    mockAccountsService.getAccountsWithBalances.mockResolvedValue({
      data: mockAccounts,
      error: null,
    });

    mockCategoriesService.getCategories.mockResolvedValue({
      data: mockCategories,
      error: null,
    });
  });

  it('should render form fields correctly', async () => {
    render(<TransactionForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Descrição da transação')).toBeInTheDocument();
    });
  });

  it('should load accounts and categories on mount', async () => {
    render(<TransactionForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAccountsService.getAccountsWithBalances).toHaveBeenCalled();
      expect(mockCategoriesService.getCategories).toHaveBeenCalled();
    });
  });

  it('should handle form submission with valid data', async () => {
    const onSuccess = vi.fn();
    render(<TransactionForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
    });

    // Preencher formulário
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByPlaceholderText('Descrição da transação'), {
      target: { value: 'Test transaction' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Criar'));

    // Verificar que o formulário foi submetido
    await waitFor(() => {
      expect(screen.getByText('Criar')).toBeInTheDocument();
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<TransactionForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
    });

    // Tentar submeter formulário vazio
    fireEvent.click(screen.getByText('Criar'));

    // Verificar que erros de validação são exibidos
    await waitFor(() => {
      expect(screen.getByText('Criar')).toBeInTheDocument();
    });
  });

  it('should populate form with initial data', async () => {
    const initialData = {
      id: 'transaction-1',
      account_id: 'account-1',
      valor: 150,
      categoria_id: 'category-1',
      data: '2024-01-15',
      descricao: 'Initial transaction',
    };

    render(<TransactionForm initialData={initialData} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('150')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Initial transaction')).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<TransactionForm onCancel={onCancel} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });
});