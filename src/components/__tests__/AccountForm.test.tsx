import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AccountForm from '../AccountForm';
import { useAuth } from '../../contexts/AuthContext';
import * as accountsService from '../../services/accounts';

// Mock dos serviços e hooks
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/accounts');

const mockUseAuth = vi.mocked(useAuth);
const mockAccountsService = vi.mocked(accountsService);

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

describe('AccountForm', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    mockAccountsService.createAccount.mockResolvedValue({
      data: { id: 'new-account-id', nome: 'Nova Conta', tipo: 'corrente' },
      error: null,
    });

    mockAccountsService.updateAccount.mockResolvedValue({
      data: { id: 'account-1', nome: 'Conta Atualizada', tipo: 'poupanca' },
      error: null,
    });
  });

  it('should render form fields correctly', () => {
    render(
      <AccountForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText('Nome da conta')).toBeInTheDocument();
    expect(screen.getByText('Tipo de Conta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Saldo inicial (opcional)')).toBeInTheDocument();
    expect(screen.getByText('Criar Conta')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('should handle form submission for new account', async () => {
    render(
      <AccountForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Preencher formulário
    fireEvent.change(screen.getByPlaceholderText('Nome da conta'), {
      target: { value: 'Conta Teste' },
    });
    
    fireEvent.change(screen.getByPlaceholderText('Saldo inicial (opcional)'), {
      target: { value: '1000' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Criar Conta'));

    await waitFor(() => {
      expect(mockAccountsService.createAccount).toHaveBeenCalledWith({
        nome: 'Conta Teste',
        tipo: 'corrente',
        saldo_inicial: 1000,
        user_id: 'test-user-id',
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle form submission for editing account', async () => {
    const existingAccount = {
      id: 'account-1',
      nome: 'Conta Existente',
      tipo: 'corrente' as const,
      saldo_inicial: 500,
    };

    render(
      <AccountForm 
        account={existingAccount}
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />,
      { wrapper: createWrapper() }
    );

    // Verificar se os campos estão preenchidos
    expect(screen.getByDisplayValue('Conta Existente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByText('Atualizar Conta')).toBeInTheDocument();

    // Alterar nome
    fireEvent.change(screen.getByDisplayValue('Conta Existente'), {
      target: { value: 'Conta Atualizada' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Atualizar Conta'));

    await waitFor(() => {
      expect(mockAccountsService.updateAccount).toHaveBeenCalledWith(
        'account-1',
        {
          nome: 'Conta Atualizada',
          tipo: 'corrente',
          saldo_inicial: 500,
        }
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle cancel button click', () => {
    render(
      <AccountForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    render(
      <AccountForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Tentar submeter sem preencher campos obrigatórios
    fireEvent.click(screen.getByText('Criar Conta'));

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter pelo menos 2 caracteres')).toBeInTheDocument();
    });

    expect(mockAccountsService.createAccount).not.toHaveBeenCalled();
  });

  it('should handle numeric input for saldo inicial', () => {
    render(
      <AccountForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    const saldoInput = screen.getByPlaceholderText('Saldo inicial (opcional)');
    
    // Testar input numérico válido
    fireEvent.change(saldoInput, { target: { value: '1500.50' } });
    expect(saldoInput).toHaveValue('1500.50');

    // Testar input não numérico (deve ser filtrado)
    fireEvent.change(saldoInput, { target: { value: 'abc123' } });
    expect(saldoInput).toHaveValue('123');
  });
});