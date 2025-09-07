import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccountsQuery';
import * as accountsService from '@/services/accounts';
import { useAuth } from '@/contexts/AuthContext';

// Mock dos serviços
vi.mock('@/services/accounts');
vi.mock('@/contexts/AuthContext');

const mockAccountsService = vi.mocked(accountsService);
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

describe('useAccountsQuery', () => {
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

  describe('useAccounts', () => {
    it('should fetch accounts successfully', async () => {
      const mockAccounts = [
        { id: '1', nome: 'Conta Corrente', tipo: 'corrente', saldo_atual: 1000 },
        { id: '2', nome: 'Conta Poupança', tipo: 'poupanca', saldo_atual: 5000 },
      ];

      mockAccountsService.getAccounts.mockResolvedValue({
        data: mockAccounts,
        error: null,
      });

      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAccounts);
      expect(mockAccountsService.getAccounts).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle fetch accounts error', async () => {
      mockAccountsService.getAccounts.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch accounts' },
      });

      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when user is not available', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(mockAccountsService.getAccounts).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAccount', () => {
    it('should create account successfully', async () => {
      const newAccount = {
        nome: 'Nova Conta',
        tipo: 'corrente' as const,
        saldo_inicial: 1000,
        user_id: 'test-user-id',
      };

      const createdAccount = {
        id: 'new-account-id',
        ...newAccount,
        saldo_atual: 1000,
      };

      mockAccountsService.createAccount.mockResolvedValue({
        data: createdAccount,
        error: null,
      });

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newAccount);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(createdAccount);
      expect(mockAccountsService.createAccount).toHaveBeenCalledWith(newAccount);
    });

    it('should handle create account error', async () => {
      const newAccount = {
        nome: 'Nova Conta',
        tipo: 'corrente' as const,
        saldo_inicial: 1000,
        user_id: 'test-user-id',
      };

      mockAccountsService.createAccount.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create account' },
      });

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newAccount);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUpdateAccount', () => {
    it('should update account successfully', async () => {
      const accountId = 'account-1';
      const updateData = {
        nome: 'Conta Atualizada',
        tipo: 'poupanca' as const,
        saldo_inicial: 2000,
      };

      const updatedAccount = {
        id: accountId,
        ...updateData,
        saldo_atual: 2000,
      };

      mockAccountsService.updateAccount.mockResolvedValue({
        data: updatedAccount,
        error: null,
      });

      const { result } = renderHook(() => useUpdateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: accountId, ...updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedAccount);
      expect(mockAccountsService.updateAccount).toHaveBeenCalledWith(accountId, updateData);
    });

    it('should handle update account error', async () => {
      const accountId = 'account-1';
      const updateData = {
        nome: 'Conta Atualizada',
        tipo: 'poupanca' as const,
        saldo_inicial: 2000,
      };

      mockAccountsService.updateAccount.mockResolvedValue({
        data: null,
        error: { message: 'Failed to update account' },
      });

      const { result } = renderHook(() => useUpdateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: accountId, ...updateData });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDeleteAccount', () => {
    it('should delete account successfully', async () => {
      const accountId = 'account-1';

      mockAccountsService.deleteAccount.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(accountId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAccountsService.deleteAccount).toHaveBeenCalledWith(accountId);
    });

    it('should handle delete account error', async () => {
      const accountId = 'account-1';

      mockAccountsService.deleteAccount.mockResolvedValue({
        data: null,
        error: { message: 'Failed to delete account' },
      });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(accountId);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});