import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import CategoryForm from '../CategoryForm';
import { useAuth } from '../../contexts/AuthContext';
import * as categoriesService from '../../services/categories';

// Mock dos módulos
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/categories');

const mockUseAuth = vi.mocked(useAuth);
const mockCategoriesService = vi.mocked(categoriesService);

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
  });

  describe('Create Mode', () => {
    it('should render form fields correctly', () => {
      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ícone/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar categoria/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should submit form with correct data', async () => {
      const user = userEvent.setup();
      const createdCategory = {
        id: 'new-category-id',
        nome: 'Nova Categoria',
        tipo: 'despesa',
        cor: '#FF6B6B',
        icone: 'shopping-cart',
        user_id: 'user-123',
        created_at: '2024-01-20T10:00:00Z',
      };

      mockCategoriesService.createCategory.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos
      await user.type(screen.getByLabelText(/nome/i), 'Nova Categoria');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'despesa');
      await user.type(screen.getByLabelText(/cor/i), '#FF6B6B');
      await user.type(screen.getByLabelText(/ícone/i), 'shopping-cart');

      // Submeter formulário
      await user.click(screen.getByRole('button', { name: /criar categoria/i }));

      await waitFor(() => {
        expect(mockCategoriesService.createCategory).toHaveBeenCalledWith({
          nome: 'Nova Categoria',
          tipo: 'despesa',
          cor: '#FF6B6B',
          icone: 'shopping-cart',
          user_id: 'user-123',
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(createdCategory);
      });
    });

    it('should handle cancel button', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Tentar submeter sem preencher campos obrigatórios
      await user.click(screen.getByRole('button', { name: /criar categoria/i }));

      // Verificar se os campos obrigatórios são validados
      expect(screen.getByLabelText(/nome/i)).toBeInvalid();
      expect(mockCategoriesService.createCategory).not.toHaveBeenCalled();
    });

    it('should handle create error', async () => {
      const user = userEvent.setup();
      const mockError = { message: 'Insert failed' };

      mockCategoriesService.createCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos
      await user.type(screen.getByLabelText(/nome/i), 'Nova Categoria');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'despesa');
      await user.type(screen.getByLabelText(/cor/i), '#FF6B6B');
      await user.type(screen.getByLabelText(/ícone/i), 'shopping-cart');

      // Submeter formulário
      await user.click(screen.getByRole('button', { name: /criar categoria/i }));

      await waitFor(() => {
        expect(mockCategoriesService.createCategory).toHaveBeenCalled();
      });

      // Verificar se o erro é exibido
      await waitFor(() => {
        expect(screen.getByText(/insert failed/i)).toBeInTheDocument();
      });

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
          category={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue('Categoria Existente')).toBeInTheDocument();
      expect(screen.getByDisplayValue('receita')).toBeInTheDocument();
      expect(screen.getByDisplayValue('#4ECDC4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('money-bill')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /atualizar categoria/i })).toBeInTheDocument();
    });

    it('should submit update with correct data', async () => {
      const user = userEvent.setup();
      const updatedCategory = {
        ...existingCategory,
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
      };

      mockCategoriesService.updateCategory.mockResolvedValue({
        data: updatedCategory,
        error: null,
      });

      renderWithWrapper(
        <CategoryForm
          category={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Alterar campos
      await user.clear(screen.getByLabelText(/nome/i));
      await user.type(screen.getByLabelText(/nome/i), 'Categoria Atualizada');
      await user.clear(screen.getByLabelText(/cor/i));
      await user.type(screen.getByLabelText(/cor/i), '#E74C3C');

      // Submeter formulário
      await user.click(screen.getByRole('button', { name: /atualizar categoria/i }));

      await waitFor(() => {
        expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith(
          'category-1',
          {
            nome: 'Categoria Atualizada',
            tipo: 'receita',
            cor: '#E74C3C',
            icone: 'money-bill',
          }
        );
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedCategory);
      });
    });

    it('should handle update error', async () => {
      const user = userEvent.setup();
      const mockError = { message: 'Update failed' };

      mockCategoriesService.updateCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      renderWithWrapper(
        <CategoryForm
          category={existingCategory}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Alterar um campo
      await user.clear(screen.getByLabelText(/nome/i));
      await user.type(screen.getByLabelText(/nome/i), 'Categoria Atualizada');

      // Submeter formulário
      await user.click(screen.getByRole('button', { name: /atualizar categoria/i }));

      await waitFor(() => {
        expect(mockCategoriesService.updateCategory).toHaveBeenCalled();
      });

      // Verificar se o erro é exibido
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Type Selection', () => {
    it('should allow selecting expense type', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      await user.selectOptions(screen.getByLabelText(/tipo/i), 'despesa');

      expect(screen.getByDisplayValue('despesa')).toBeInTheDocument();
    });

    it('should allow selecting income type', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      await user.selectOptions(screen.getByLabelText(/tipo/i), 'receita');

      expect(screen.getByDisplayValue('receita')).toBeInTheDocument();
    });
  });

  describe('Color Input', () => {
    it('should handle color input changes', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const colorInput = screen.getByLabelText(/cor/i);
      await user.type(colorInput, '#FF5733');

      expect(colorInput).toHaveValue('#FF5733');
    });
  });

  describe('Icon Input', () => {
    it('should handle icon input changes', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const iconInput = screen.getByLabelText(/ícone/i);
      await user.type(iconInput, 'heart');

      expect(iconInput).toHaveValue('heart');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock para simular loading
      mockCategoriesService.createCategory.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      );

      renderWithWrapper(
        <CategoryForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Preencher campos
      await user.type(screen.getByLabelText(/nome/i), 'Nova Categoria');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'despesa');
      await user.type(screen.getByLabelText(/cor/i), '#FF6B6B');
      await user.type(screen.getByLabelText(/ícone/i), 'shopping-cart');

      // Submeter formulário
      await user.click(screen.getByRole('button', { name: /criar categoria/i }));

      // Verificar estado de loading
      expect(screen.getByRole('button', { name: /criando.../i })).toBeInTheDocument();
    });
  });
});