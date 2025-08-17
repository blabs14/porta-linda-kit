import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const mockAccount = {
  id: 'test-account-id',
  name: 'Test Account',
  type: 'checking',
  balance: 1000,
  user_id: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const mockTransaction = {
  id: 'test-transaction-id',
  description: 'Test Transaction',
  amount: 100,
  type: 'expense',
  account_id: mockAccount.id,
  category_id: 'test-category-id',
  date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const mockCategory = {
  id: 'test-category-id',
  name: 'Test Category',
  type: 'expense',
  color: '#FF0000',
  user_id: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const mockGoal = {
  id: 'test-goal-id',
  title: 'Test Goal',
  description: 'Test goal description',
  target_amount: 5000,
  current_amount: 1000,
  target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  user_id: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Utility functions
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockSupabaseResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
});

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };