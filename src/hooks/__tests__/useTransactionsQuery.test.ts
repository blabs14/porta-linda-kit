import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../useTransactionsQuery';
import * as transactionService from '../../services/transactions';
import { useAuth } from '../../contexts/AuthContext';

// Mock dos serviços
vi.mock('../../services/transactions');
vi.mock('../../contexts/AuthContext');

const mockTransactionService = vi.mocked(transactionService);
const mockUseAuth = vi.mocked(useAuth);

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

describe('useTransactionsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  describe('useTransactions', () => {
    it('should fetch transactions successfully', async () => {
      const mockTransactions = [
        { id: '1', valor: 100, tipo: 'receita' },
        { id: '2', valor: 50, tipo: 'despesa' },
      ];

      mockTransactionService.getTransactions.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTransactions);
      expect(mockTransactionService.getTransactions).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const mockTransactions = [
        { id: '1', account_id: 'account-1', valor: 100 },
        { id: '2', account_id: 'account-2', valor: 50 },
      ];

      mockTransactionService.getTransactions.mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      const filters = { account_id: 'account-1' };
      const { result } = renderHook(() => useTransactions(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].account_id).toBe('account-1');
    });

    it('should handle errors', async () => {
      const mockError = new Error('Failed to fetch');
      mockTransactionService.getTransactions.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreateTransaction', () => {
    it('should create transaction successfully', async () => {
      const mockTransaction = {
        account_id: 'account-1',
        valor: 100,
        categoria_id: 'category-1',
        data: '2024-01-15',
        descricao: 'Test transaction',
      };

      mockTransactionService.createTransaction.mockResolvedValue({
        data: { id: 'new-transaction-id', ...mockTransaction },
        error: null,
      });

      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync(mockTransaction);

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        mockTransaction,
        'test-user-id'
      );
    });

    it('should handle creation errors', async () => {
      const mockError = new Error('Failed to create');
      mockTransactionService.createTransaction.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(),
      });

      try {
        await result.current.mutateAsync({
          account_id: 'account-1',
          valor: 100,
          categoria_id: 'category-1',
          data: '2024-01-15',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('useUpdateTransaction', () => {
    it('should update transaction successfully', async () => {
      const mockUpdateData = {
        valor: 150,
        descricao: 'Updated transaction',
      };

      mockTransactionService.updateTransaction.mockResolvedValue({
        data: { id: 'transaction-id', ...mockUpdateData },
        error: null,
      });

      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'transaction-id',
        data: mockUpdateData,
      });

      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
        'transaction-id',
        mockUpdateData,
        'test-user-id'
      );
    });
  });

  describe('useDeleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      mockTransactionService.deleteTransaction.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('transaction-id');

      expect(mockTransactionService.deleteTransaction).toHaveBeenCalledWith(
        'transaction-id',
        'test-user-id'
      );
    });
  });
});