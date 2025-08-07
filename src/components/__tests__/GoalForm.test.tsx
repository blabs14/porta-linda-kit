import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GoalForm from '../GoalForm';
import { useAuth } from '../../contexts/AuthContext';
import * as goalsService from '../../services/goals';

// Mock dos serviços e hooks
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/goals');

const mockUseAuth = vi.mocked(useAuth);
const mockGoalsService = vi.mocked(goalsService);

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

describe('GoalForm', () => {
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

    mockGoalsService.createGoal.mockResolvedValue({
      data: { 
        id: 'new-goal-id', 
        nome: 'Novo Objetivo', 
        valor_alvo: 5000,
        valor_atual: 0,
        data_limite: '2024-12-31'
      },
      error: null,
    });

    mockGoalsService.updateGoal.mockResolvedValue({
      data: { 
        id: 'goal-1', 
        nome: 'Objetivo Atualizado', 
        valor_alvo: 10000,
        valor_atual: 2500,
        data_limite: '2025-06-30'
      },
      error: null,
    });
  });

  it('should render form fields correctly', () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText('Nome do objetivo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Valor alvo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descrição (opcional)')).toBeInTheDocument();
    expect(screen.getByText('Data Limite')).toBeInTheDocument();
    expect(screen.getByText('Criar Objetivo')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('should handle form submission for new goal', async () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Preencher formulário
    fireEvent.change(screen.getByPlaceholderText('Nome do objetivo'), {
      target: { value: 'Viagem para Europa' },
    });
    
    fireEvent.change(screen.getByPlaceholderText('Valor alvo'), {
      target: { value: '8000' },
    });

    fireEvent.change(screen.getByPlaceholderText('Descrição (opcional)'), {
      target: { value: 'Economizar para viagem de férias' },
    });

    // Definir data limite
    const dateInput = screen.getByDisplayValue('');
    fireEvent.change(dateInput, {
      target: { value: '2024-12-31' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Criar Objetivo'));

    await waitFor(() => {
      expect(mockGoalsService.createGoal).toHaveBeenCalledWith({
        nome: 'Viagem para Europa',
        valor_alvo: 8000,
        descricao: 'Economizar para viagem de férias',
        data_limite: '2024-12-31',
        user_id: 'test-user-id',
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle form submission for editing goal', async () => {
    const existingGoal = {
      id: 'goal-1',
      nome: 'Objetivo Existente',
      valor_alvo: 5000,
      valor_atual: 1500,
      descricao: 'Descrição existente',
      data_limite: '2024-06-30',
    };

    render(
      <GoalForm 
        goal={existingGoal}
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />,
      { wrapper: createWrapper() }
    );

    // Verificar se os campos estão preenchidos
    expect(screen.getByDisplayValue('Objetivo Existente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Descrição existente')).toBeInTheDocument();
    expect(screen.getByText('Atualizar Objetivo')).toBeInTheDocument();

    // Alterar valor alvo
    fireEvent.change(screen.getByDisplayValue('5000'), {
      target: { value: '7500' },
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Atualizar Objetivo'));

    await waitFor(() => {
      expect(mockGoalsService.updateGoal).toHaveBeenCalledWith(
        'goal-1',
        {
          nome: 'Objetivo Existente',
          valor_alvo: 7500,
          descricao: 'Descrição existente',
          data_limite: '2024-06-30',
        }
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle cancel button click', () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Tentar submeter sem preencher campos obrigatórios
    fireEvent.click(screen.getByText('Criar Objetivo'));

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter pelo menos 2 caracteres')).toBeInTheDocument();
    });

    expect(mockGoalsService.createGoal).not.toHaveBeenCalled();
  });

  it('should validate minimum value for valor_alvo', async () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Preencher nome válido
    fireEvent.change(screen.getByPlaceholderText('Nome do objetivo'), {
      target: { value: 'Objetivo Teste' },
    });

    // Preencher valor inválido (muito baixo)
    fireEvent.change(screen.getByPlaceholderText('Valor alvo'), {
      target: { value: '0' },
    });

    fireEvent.click(screen.getByText('Criar Objetivo'));

    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que 0')).toBeInTheDocument();
    });

    expect(mockGoalsService.createGoal).not.toHaveBeenCalled();
  });

  it('should handle numeric input for valor_alvo', () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    const valorInput = screen.getByPlaceholderText('Valor alvo');
    
    // Testar input numérico válido
    fireEvent.change(valorInput, { target: { value: '2500.75' } });
    expect(valorInput).toHaveValue('2500.75');

    // Testar input não numérico (deve ser filtrado)
    fireEvent.change(valorInput, { target: { value: 'abc456' } });
    expect(valorInput).toHaveValue('456');
  });

  it('should validate future date for data_limite', async () => {
    render(
      <GoalForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Preencher campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Nome do objetivo'), {
      target: { value: 'Objetivo Teste' },
    });
    
    fireEvent.change(screen.getByPlaceholderText('Valor alvo'), {
      target: { value: '1000' },
    });

    // Definir data no passado
    const dateInput = screen.getByDisplayValue('');
    fireEvent.change(dateInput, {
      target: { value: '2020-01-01' },
    });

    fireEvent.click(screen.getByText('Criar Objetivo'));

    await waitFor(() => {
      expect(screen.getByText('Data deve ser no futuro')).toBeInTheDocument();
    });

    expect(mockGoalsService.createGoal).not.toHaveBeenCalled();
  });
});