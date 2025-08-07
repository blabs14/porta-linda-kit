import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockResolvedValue({ data: [], error: null })
  })),
  auth: {
    signUp: vi.fn().mockResolvedValue({ 
      data: { user: { email: 'test@test.com' } }, 
      error: null 
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ 
      data: { user: { email: 'test@test.com' } }, 
      error: null 
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
};

vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabaseClient
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock do window.URL
class MockURL {
  constructor(url: string, base?: string | URL) {
    if (base) {
      const baseStr = typeof base === 'string' ? base : base.href;
      this.href = baseStr.endsWith('/') ? baseStr + url : baseStr + '/' + url;
    } else {
      this.href = url;
    }
  }
  href: string;
  protocol: string = 'https:';
  host: string = 'localhost';
  hostname: string = 'localhost';
  port: string = '';
  pathname: string = '/';
  search: string = '';
  hash: string = '';
  origin: string = 'https://localhost';
  
  static createObjectURL = vi.fn(() => 'mock-url');
  static revokeObjectURL = vi.fn();
}

Object.defineProperty(window, 'URL', {
  value: MockURL,
  writable: true,
});

// Também definir globalmente para Node.js
global.URL = MockURL as any;

// Mock do document.createElement
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
};
const originalCreateElement = document.createElement;
document.createElement = vi.fn((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock do console.error para evitar spam nos testes
const originalError = console.error;
vi.stubGlobal('console', {
  ...console,
  error: vi.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  }),
});

// Cleanup após cada teste
afterEach(() => {
  vi.clearAllMocks();
});