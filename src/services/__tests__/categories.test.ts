import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabaseClient';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../categories';
// Mock do Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mockSupabase = vi.mocked(supabase);

// Helper para criar mock query
const createMockQuery = (resolvedValue: any) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(resolvedValue),
  // Para operações que não usam single
  then: vi.fn().mockResolvedValue(resolvedValue),
});

describe('Categories Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        {
          id: '1',
          nome: 'Alimentação',
          tipo: 'despesa',
          cor: '#FF6B6B',
          icone: 'utensils',
          user_id: 'user-123',
          created_at: '2024-01-20T10:00:00Z',
        },
        {
          id: '2',
          nome: 'Salário',
          tipo: 'receita',
          cor: '#4ECDC4',
          icone: 'money-bill',
          user_id: 'user-123',
          created_at: '2024-01-20T11:00:00Z',
        },
      ];

      const mockQuery = createMockQuery({
        data: mockCategories,
        error: null,
      });
      
      // Override order para retornar o resultado final
      mockQuery.order = vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getCategories();

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.order).toHaveBeenCalledWith('nome');
      expect(result.data).toEqual(mockCategories);
      expect(result.error).toBeNull();
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

      const mockQuery = createMockQuery({
        data: mockExpenseCategories,
        error: null,
      });
      
      // Override order para retornar o resultado final
      mockQuery.order = vi.fn().mockResolvedValue({
        data: mockExpenseCategories,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getCategories('user-123', 'despesa');

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('tipo', 'despesa');
      expect(mockQuery.order).toHaveBeenCalledWith('nome');
      expect(result.data).toEqual(mockExpenseCategories);
    });

    it('should handle fetch error', async () => {
      const mockQuery = createMockQuery({
        data: null,
        error: { message: 'Database error' },
      });
      
      // Override order para retornar o resultado final
      mockQuery.order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getCategories();

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Database error' });
    });
  });

  describe('getCategory', () => {
    it('should fetch single category', async () => {
      const mockCategory = {
        id: '1',
        nome: 'Alimentação',
        tipo: 'despesa',
        cor: '#FF6B6B',
        icone: 'utensils',
        user_id: 'user-123',
        created_at: '2024-01-20T10:00:00Z',
      };

      const mockQuery = createMockQuery({ data: mockCategory, error: null });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getCategory('category-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'category-1');
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockCategory);
    });

    it('should handle category not found', async () => {
      const mockQuery = createMockQuery({ data: null, error: { message: 'Category not found' } });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getCategory('non-existent');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Category not found' });
    });
  });

  describe('createCategory', () => {
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

      const mockQuery = createMockQuery({ data: createdCategory, error: null });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await createCategory(newCategory);

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.insert).toHaveBeenCalledWith([newCategory]);
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result.data).toEqual(createdCategory);
    });

    it('should handle create error', async () => {
      const newCategory = {
        nome: 'Nova Categoria',
        tipo: 'despesa' as const,
        cor: '#9B59B6',
        icone: 'shopping-cart',
        user_id: 'user-123',
      };

      const mockQuery = createMockQuery({ data: null, error: { message: 'Insert failed' } });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await createCategory(newCategory);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Insert failed' });
    });

    it('should handle duplicate category name error', async () => {
      const newCategory = {
        nome: 'Alimentação',
        tipo: 'despesa' as const,
        cor: '#9B59B6',
        icone: 'shopping-cart',
        user_id: 'user-123',
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
          },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await createCategory(newCategory);

      expect(result.error).toEqual({
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      });
    });
  });

  describe('updateCategory', () => {
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

      const mockQuery = createMockQuery({ data: updatedCategory, error: null });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await updateCategory('category-1', updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.update).toHaveBeenCalledWith(updateData);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'category-1');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result.data).toEqual(updatedCategory);
    });

    it('should handle update error', async () => {
      const updateData = {
        nome: 'Categoria Atualizada',
        cor: '#E74C3C',
      };

      const mockQuery = createMockQuery({ data: null, error: { message: 'Update failed' } });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await updateCategory('category-1', updateData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Update failed' });
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const mockQuery = createMockQuery({ data: null, error: null });
      
      // Override eq para retornar o resultado final
      mockQuery.eq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await deleteCategory('category-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'category-1');
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle delete error', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await deleteCategory('category-1');

      expect(result.error).toEqual({ message: 'Delete failed' });
    });

    it('should handle foreign key constraint error', async () => {
      const mockQuery = createMockQuery({
        data: null,
        error: {
          message: 'violates foreign key constraint',
          code: '23503',
        },
      });
      
      // Override eq para retornar o resultado final
      mockQuery.eq = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'violates foreign key constraint',
          code: '23503',
        },
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await deleteCategory('category-1');

      expect(result.error).toEqual({
        message: 'violates foreign key constraint',
        code: '23503',
      });
    });
  });
});