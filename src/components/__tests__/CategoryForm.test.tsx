import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import CategoryForm from '../CategoryForm';
import { useAuth } from '../../contexts/AuthContext';
import * as categoriesHooks from '../../hooks/useCategoriesQuery';

// Mock dos módulos
vi.mock('../../contexts/AuthContext');
vi.mock('../../hooks/useCategoriesQuery');

const mockUseAuth = vi.mocked(useAuth);
const mockCategoriesHooks = vi.mocked(categoriesHooks);

// Wrapper para React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderWithWrapper = (component: ReactNode) => {
  return render(component, { wrapper: createWrapper() });
};

describe('CategoryForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    } as any);

    // Mocks padrão para os hooks
    mockCategoriesHooks.useCreateCategory.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    mockCategoriesHooks.useUpdateCategory.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Create Mode', () => {
    it('should render form fields correctly', () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ícone/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should submit form with correct data', async () => {
      const createdCategory = {
        id: 'new-category-id',
        nome: 'Nova Categoria',
        tipo: 'despesa' as const,
        cor: '#FF6B6B',
        icone: 'shopping-cart',
        user_id: 'user-123',
        created_at: '2024-01-20T10:00:00Z',
      };

      // Configurar o mock mutateAsync para retornar a categoria criada
      const mockMutateAsync = vi.fn().mockResolvedValue(createdCategory);
      mockCategoriesHooks.useCreateCategory.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
      } as any);

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos básicos
      fireEvent.change(screen.getByPlaceholderText('Nome da categoria'), { target: { value: 'Nova Categoria' } });
      fireEvent.change(screen.getByLabelText(/cor/i), { target: { value: '#FF6B6B' } });
      fireEvent.change(screen.getByPlaceholderText('Emoji ou ícone'), { target: { value: 'shopping-cart' } });

      // Submeter formulário
      fireEvent.click(screen.getByRole('button', { name: /criar/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
      
      expect(mockMutateAsync).toHaveBeenCalledWith({
        nome: 'Nova Categoria',
        tipo: 'despesa',
        cor: '#ff6b6b',
        icone: 'shopping-cart',
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle cancel button', async () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const mockCreateMutation = {
        mutateAsync: vi.fn(),
        isPending: false,
        isError: false,
        error: null,
      };

      mockCategoriesHooks.useCreateCategory.mockReturnValue(mockCreateMutation as any);

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Tentar submeter sem preencher campos obrigatórios
      fireEvent.click(screen.getByRole('button', { name: /criar/i }));

      // Verificar se os campos obrigatórios são validados
      expect(screen.getByPlaceholderText('Nome da categoria')).toBeInvalid();
      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('should handle create error', async () => {
      const mockError = new Error('Insert failed');
      const mockCreateMutation = {
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
        isError: true,
        error: mockError,
      };

      mockCategoriesHooks.useCreateCategory.mockReturnValue(mockCreateMutation as any);

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos básicos
      fireEvent.change(screen.getByPlaceholderText('Nome da categoria'), { target: { value: 'Nova Categoria' } });
      fireEvent.change(screen.getByLabelText(/cor/i), { target: { value: '#FF6B6B' } });
      fireEvent.change(screen.getByPlaceholderText('Emoji ou ícone'), { target: { value: 'shopping-cart' } });

      // Submeter formulário
      fireEvent.click(screen.getByRole('button', { name: /criar/i }));

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalled();
      });

      // O erro é tratado pelo hook, não precisa verificar mensagem específica
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const existingCategory = {
      id: 'category-1',
      nome: 'Categoria Existente',
      tipo: 'receita' as const,
      cor: '#4ECDC4',
      icone: 'money-bill',
      user_id: 'user-123',
      created_at: '2024-01-20T10:00:00Z',
    };

    it('should populate form with existing data', () => {
      renderWithWrapper(
        <CategoryForm
          initialData={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('Categoria Existente')).toBeInTheDocument();
      expect(screen.getByDisplayValue('#4ecdc4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('money-bill')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /atualizar/i })).toBeInTheDocument();
    });

    it('should submit update with correct data', async () => {
      const updatedCategory = {
        ...existingCategory,
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
      };

      const mockUpdateMutation = {
        mutateAsync: vi.fn().mockResolvedValue(updatedCategory),
        isPending: false,
        isError: false,
        error: null,
      };

      mockCategoriesHooks.useUpdateCategory.mockReturnValue(mockUpdateMutation as any);

      renderWithWrapper(
        <CategoryForm
          initialData={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Alterar campos
      const nomeInput = screen.getByPlaceholderText('Nome da categoria');
      fireEvent.change(nomeInput, { target: { value: '' } });
      fireEvent.change(nomeInput, { target: { value: 'Categoria Atualizada' } });
      fireEvent.change(screen.getByLabelText(/cor/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/cor/i), { target: { value: '#E74C3C' } });

      // Submeter formulário
      fireEvent.click(screen.getByText('Atualizar'));

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'category-1',
        data: {
          nome: 'Categoria Atualizada',
          tipo: 'receita',
          cor: '#e74c3c',
          icone: 'money-bill',
        }
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle update error', async () => {
      const mockError = new Error('Update failed');
      const mockUpdateMutation = {
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
        isError: true,
        error: mockError,
      };

      mockCategoriesHooks.useUpdateCategory.mockReturnValue(mockUpdateMutation as any);

      renderWithWrapper(
        <CategoryForm
          initialData={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Alterar um campo
      const nomeInput = screen.getByPlaceholderText('Nome da categoria');
      fireEvent.change(nomeInput, { target: { value: '' } });
      fireEvent.change(nomeInput, { target: { value: 'Categoria Atualizada' } });

      // Submeter formulário
      fireEvent.click(screen.getByText('Atualizar'));

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
      });

      // Verificar se a função foi chamada com os dados corretos
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        id: existingCategory.id,
        data: expect.objectContaining({
          nome: 'Categoria Atualizada',
          cor: '#4ECDC4',
          icone: 'money-bill',
          tipo: 'receita'
        })
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Type Selection', () => {
    it('should render type selection field', () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Verificar se o campo de tipo está presente
      const typeSelect = screen.getByRole('combobox');
      expect(typeSelect).toBeInTheDocument();
    });
   });

   describe('Color Input', () => {
    it('should handle color input changes', async () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const colorInput = screen.getByLabelText(/cor/i);
      fireEvent.change(colorInput, { target: { value: '#FF5733' } });

      expect(colorInput).toHaveValue('#ff5733');
    });
  });

  describe('Icon Input', () => {
    it('should handle icon input changes', async () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const iconInput = screen.getByPlaceholderText('Emoji ou ícone');
      fireEvent.change(iconInput, { target: { value: 'heart' } });

      expect(iconInput).toHaveValue('heart');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      // Mock para simular loading
      const mockCreateMutation = {
        mutateAsync: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({}), 100))
        ),
        isPending: true,
        isError: false,
        error: null,
      };

      mockCategoriesHooks.useCreateCategory.mockReturnValue(mockCreateMutation as any);

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos básicos
      fireEvent.change(screen.getByPlaceholderText('Nome da categoria'), { target: { value: 'Nova Categoria' } });
      fireEvent.change(screen.getByLabelText(/cor/i), { target: { value: '#FF6B6B' } });
      fireEvent.change(screen.getByPlaceholderText('Emoji ou ícone'), { target: { value: 'shopping-cart' } });

      // Submeter formulário
      fireEvent.click(screen.getByRole('button', { name: /criar/i }));

      // Verificar que o botão está desabilitado durante o loading
      const submitButton = screen.getByRole('button', { name: /criar/i });
      expect(submitButton).toBeDisabled();
    });
  });
});