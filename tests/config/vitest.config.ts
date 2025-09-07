import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './setup.ts')],
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/tests/obsolete/**',
      '**/tests/manual/**'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'cypress/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/types/**',
        'scripts/'
      ],
      include: [
        'src/**/*.{js,ts,jsx,tsx}'
      ],
      thresholds: {
        global: {
          branches: 35,
          functions: 25,
          lines: 9,
          statements: 9
        },
        // Thresholds baseados na cobertura atual
        'src/components/ui/**': {
          branches: 20,
          functions: 10,
          lines: 13,
          statements: 13
        },
        'src/services/**': {
          branches: 35,
          functions: 25,
          lines: 9,
          statements: 9
        },
        'src/hooks/**': {
          branches: 60,
          functions: 50,
          lines: 19,
          statements: 19
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@/components': path.resolve(__dirname, '../../src/components'),
      '@/hooks': path.resolve(__dirname, '../../src/hooks'),
      '@/services': path.resolve(__dirname, '../../src/services'),
      '@/types': path.resolve(__dirname, '../../src/types'),
      '@/utils': path.resolve(__dirname, '../../src/utils')
    }
  }
});