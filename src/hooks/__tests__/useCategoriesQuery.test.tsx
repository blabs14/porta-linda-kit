import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../useCategoriesQuery';
import * as categoriesService from '../../services/categories';
import { useAuth } from '../../contexts/AuthContext';

// Mock dos serviços
vi.mock('../../services/categories');
vi.mock('../../contexts/AuthContext');

const mockCategoriesService = vi.mocked(categoriesService);
const mockUseAuth = vi.mocked(useAuth);

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

describe('Categories Query Hooks', () => {
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

  describe('useCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        {
          id: '1',
          nome: 'Alimentação',
          tipo: 'despesa',
          cor: '#FF6B6B',
          icone: 'utensils',
          user_id: 'user-123',
        },
        {
          id: '2',
          nome: 'Salário',
          tipo: 'receita',
          cor: '#4ECDC4',
          icone: 'money-bill',
          user_id: 'user-123',
        },
      ];

      mockCategoriesService.getCategories.mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCategoriesService.getCategories).toHaveBeenCalledWith('user-123', undefined);
      expect(result.current.data).toEqual(mockCategories);
      expect(result.current.error).toBeNull();
    });

    it('should fetch categories with type filter', async () => {
      const mockExpenseCategories = [
        {
          id: '1',
          nome: 'Alimentação',
          tipo: 'despesa',
          cor: '#FF6B6B',
          icone: 'utensils',
          user_id: 'user-123',
        },
      ];

      mockCategoriesService.getCategories.mockResolvedValue({
        data: mockExpenseCategories,
        error: null,
      });

      const { result } = renderHook(() => useCategories('despesa'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCategoriesService.getCategories).toHaveBeenCalledWith('user-123', 'despesa');
      expect(result.current.data).toEqual(mockExpenseCategories);
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error' };

      mockCategoriesService.getCategories.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should not fetch when user is not available', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      } as any);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(mockCategoriesService.getCategories).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCategory', () => {
    it('should create category successfully', async () => {
      const newCategory = {
        nome: 'Nova Categoria',
        tipo: 'despesa' as const,
        cor: '#9B59B6',
        icone: 'shopping-cart',
        user_id: 'user-123',
      };

      const createdCategory = {
        id: 'new-category-id',
        ...newCategory,
        created_at: '2024-01-20T10:00:00Z',
      };

      mockCategoriesService.createCategory.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newCategory);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCategoriesService.createCategory).toHaveBeenCalledWith(newCategory);
      expect(result.current.data).toEqual(createdCategory);
    });

    it('should handle create error', async () => {
      const newCategory = {
        nome: 'Nova Categoria',
        tipo: 'despesa' as const,
        cor: '#9B59B6',
        icone: 'shopping-cart',
        user_id: 'user-123',
      };

      const mockError = { message: 'Insert failed' };

      mockCategoriesService.createCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCreateCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newCategory);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onSuccess callback', async () => {
      const newCategory = {
        nome: 'Nova Categoria',
        tipo: 'despesa' as const,
        cor: '#9B59B6',
        icone: 'shopping-cart',
        user_id: 'user-123',
      };

      const createdCategory = {
        id: 'new-category-id',
        ...newCategory,
        created_at: '2024-01-20T10:00:00Z',
      };

      const onSuccess = vi.fn();

      mockCategoriesService.createCategory.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      const { result } = renderHook(() => useCreateCategory(onSuccess), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newCategory);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(createdCategory);
    });
  });

  describe('useUpdateCategory', () => {
    it('should update category successfully', async () => {
      const updateData = {
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
        icone: 'heart',
      };

      const updatedCategory = {
        id: 'category-1',
        ...updateData,
        tipo: 'despesa',
        user_id: 'user-123',
        created_at: '2024-01-20T10:00:00Z',
      };

      mockCategoriesService.updateCategory.mockResolvedValue({
        data: updatedCategory,
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'category-1', data: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith('category-1', updateData);
      expect(result.current.data).toEqual(updatedCategory);
    });

    it('should handle update error', async () => {
      const updateData = {
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
      };

      const mockError = { message: 'Update failed' };

      mockCategoriesService.updateCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useUpdateCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'category-1', data: updateData });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onSuccess callback', async () => {
      const updateData = {
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
      };

      const updatedCategory = {
        id: 'category-1',
        ...updateData,
        tipo: 'despesa',
        user_id: 'user-123',
        created_at: '2024-01-20T10:00:00Z',
      };

      const onSuccess = vi.fn();

      mockCategoriesService.updateCategory.mockResolvedValue({
        data: updatedCategory,
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategory(onSuccess), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'category-1', data: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedCategory);
    });
  });

  describe('useDeleteCategory', () => {
    it('should delete category successfully', async () => {
      mockCategoriesService.deleteCategory.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCategoriesService.deleteCategory).toHaveBeenCalledWith('category-1');
    });

    it('should handle delete error', async () => {
      const mockError = { message: 'Delete failed' };

      mockCategoriesService.deleteCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should handle foreign key constraint error', async () => {
      const mockError = {
        message: 'violates foreign key constraint',
        code: '23503',
      } as any;

      mockCategoriesService.deleteCategory.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useDeleteCategory(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();

      mockCategoriesService.deleteCategory.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteCategory(onSuccess), {
        wrapper: createWrapper(),
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });
}); 