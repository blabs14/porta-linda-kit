import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoalsQuery';
import * as goalsService from '@/services/goals';
import { useAuth } from '@/contexts/AuthContext';

// Mock dos serviços
vi.mock('@/services/goals');
vi.mock('@/contexts/AuthContext');

const mockGoalsService = vi.mocked(goalsService);
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

describe('useGoalsQuery', () => {
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

  describe('useGoals', () => {
    it('should fetch goals successfully', async () => {
      const mockGoals = [
        { 
          id: '1', 
          nome: 'Viagem', 
          valor_alvo: 5000, 
          valor_atual: 1500,
          data_limite: '2024-12-31',
          progresso: 30
        },
        { 
          id: '2', 
          nome: 'Carro Novo', 
          valor_alvo: 25000, 
          valor_atual: 8000,
          data_limite: '2025-06-30',
          progresso: 32
        },
      ];

      mockGoalsService.getGoals.mockResolvedValue({
        data: mockGoals,
        error: null,
      });

      const { result } = renderHook(() => useGoals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockGoals);
      expect(mockGoalsService.getGoals).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle fetch goals error', async () => {
      mockGoalsService.getGoals.mockRejectedValue(new Error('Failed to fetch goals'));

      const { result } = renderHook(() => useGoals(), {
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

      const { result } = renderHook(() => useGoals(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(mockGoalsService.getGoals).not.toHaveBeenCalled();
    });
  });

  describe('useCreateGoal', () => {
    it('should create goal successfully', async () => {
      const newGoal = {
        nome: 'Novo Objetivo',
        valor_alvo: 3000,
        descricao: 'Economizar para equipamento',
        data_limite: '2024-12-31',
        user_id: 'test-user-id',
      };

      const createdGoal = {
        id: 'new-goal-id',
        ...newGoal,
        valor_atual: 0,
        progresso: 0,
      };

      mockGoalsService.createGoal.mockResolvedValue({
        data: createdGoal,
        error: null,
      });

      const { result } = renderHook(() => useCreateGoal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newGoal);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(createdGoal);
      expect(mockGoalsService.createGoal).toHaveBeenCalledWith(newGoal);
    });

    it('should handle create goal error', async () => {
      const newGoal = {
        nome: 'Novo Objetivo',
        valor_alvo: 3000,
        descricao: 'Economizar para equipamento',
        data_limite: '2024-12-31',
        user_id: 'test-user-id',
      };

      mockGoalsService.createGoal.mockRejectedValue(
        new Error('Failed to create goal')
      );

      const { result } = renderHook(() => useCreateGoal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newGoal);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUpdateGoal', () => {
    it('should update goal successfully', async () => {
      const goalId = 'goal-1';
      const updateData = {
        nome: 'Objetivo Atualizado',
        valor_alvo: 4000,
        descricao: 'Descrição atualizada',
        data_limite: '2025-01-31',
      };

      const updatedGoal = {
        id: goalId,
        ...updateData,
        valor_atual: 1000,
        progresso: 25,
      };

      mockGoalsService.updateGoal.mockResolvedValue({
        data: updatedGoal,
        error: null,
      });

      const { result } = renderHook(() => useUpdateGoal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: goalId, ...updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedGoal);
      expect(mockGoalsService.updateGoal).toHaveBeenCalledWith(goalId, updateData);
    });

    it('should handle update goal error', async () => {
      const goalId = 'goal-1';
      const updateData = {
        nome: 'Objetivo Atualizado',
        valor_alvo: 4000,
        descricao: 'Descrição atualizada',
        data_limite: '2025-01-31',
      };

      mockGoalsService.updateGoal.mockRejectedValue(new Error('Failed to update goal'));

      const { result } = renderHook(() => useUpdateGoal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: goalId, ...updateData });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDeleteGoal', () => {
    it('should delete goal successfully', async () => {
      const goalId = 'goal-1';

      mockGoalsService.deleteGoal.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useDeleteGoal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(goalId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGoalsService.deleteGoal).toHaveBeenCalledWith(goalId);
    });

    it('should handle delete goal error', async () => {
      const goalId = 'goal-1';

      mockGoalsService.deleteGoal.mockRejectedValue(new Error('Failed to delete goal'));

      const { result } = renderHook(() => useDeleteGoal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(goalId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 3000 });

      expect(result.current.error).toBeTruthy();
    });
  });


});