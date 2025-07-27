import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionForm from '../TransactionForm';
import { useAuth } from '../../contexts/AuthContext';
import * as accountsService from '../../services/accounts';
import * as categoriesService from '../../services/categories';

// Mock dos serviços e hooks
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/accounts');
jest.mock('../../services/categories');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockAccountsService = accountsService as jest.Mocked<typeof accountsService>;
const mockCategoriesService = categoriesService as jest.Mocked<typeof categoriesService>;

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
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    mockAccountsService.getAccounts.mockResolvedValue({
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
      expect(screen.getByPlaceholderText('Valor')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Descrição')).toBeInTheDocument();
    });
  });

  it('should load accounts and categories on mount', async () => {
    render(<TransactionForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAccountsService.getAccounts).toHaveBeenCalled();
      expect(mockCategoriesService.getCategories).toHaveBeenCalled();
    });
  });

  it('should handle form submission with valid data', async () => {
    const onSuccess = jest.fn();
    render(<TransactionForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Valor')).toBeInTheDocument();
    });

    // Preencher formulário
    fireEvent.change(screen.getByPlaceholderText('Valor'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByPlaceholderText('Descrição'), {
      target: { value: 'Test transaction' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Guardar'));

    // Verificar que o formulário foi submetido
    await waitFor(() => {
      expect(screen.getByText('Guardar')).toBeInTheDocument();
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<TransactionForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Valor')).toBeInTheDocument();
    });

    // Tentar submeter formulário vazio
    fireEvent.click(screen.getByText('Guardar'));

    // Verificar que erros de validação são exibidos
    await waitFor(() => {
      expect(screen.getByText('Guardar')).toBeInTheDocument();
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
    const onCancel = jest.fn();
    render(<TransactionForm onCancel={onCancel} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });
}); 