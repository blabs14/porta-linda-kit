// Teste de debug simples
const { describe, it, expect, vi, beforeEach } = require('vitest');
const { renderHook, waitFor } = require('@testing-library/react');

// Mock simples
const mockDeleteGoal = vi.fn();
vi.mock('../src/services/goals', () => ({
  deleteGoal: mockDeleteGoal
}));

// Mock do useAuth
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}));

// Mock do QueryClient
const mockQueryClient = {
  invalidateQueries: vi.fn()
};
vi.mock('@tanstack/react-query', () => ({
  useMutation: (options) => {
    const mutate = async (data) => {
      try {
        const result = await options.mutationFn(data);
        if (options.onSuccess) options.onSuccess(result);
        return { isSuccess: true, isError: false, data: result };
      } catch (error) {
        return { isSuccess: false, isError: true, error };
      }
    };
    return { mutate, isSuccess: false, isError: false };
  },
  useQueryClient: () => mockQueryClient
}));

describe('Debug Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test mock behavior', async () => {
    // Teste com sucesso
    mockDeleteGoal.mockResolvedValue({ data: { success: true }, error: null });
    
    const result = await mockDeleteGoal('test-id');
    console.log('Success result:', result);
    expect(result.data.success).toBe(true);
    expect(result.error).toBe(null);
  });

  it('should test error behavior', async () => {
    // Teste com erro
    mockDeleteGoal.mockResolvedValue({ data: null, error: new Error('Test error') });
    
    const result = await mockDeleteGoal('test-id');
    console.log('Error result:', result);
    expect(result.data).toBe(null);
    expect(result.error).toBeInstanceOf(Error);
  });
});