import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'build', 'coverage', '**/*.min.js'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      'no-case-declarations': 'off',
    },
  },
  // Override: proibir console na pasta payroll
  {
    files: ['src/features/payroll/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: [] }],
    },
  },
  // Permitir console no módulo de logger e em testes/scripts manuais ou obsoletos
  {
    files: [
      'src/shared/lib/logger.ts',
      'tests/**/*.{js,ts,tsx,cjs}',
      'tests/manual/**/*.{js,ts,tsx,cjs}',
      'tests/obsolete/**/*.{js,ts,tsx,cjs}',
      'scripts/**/*.{js,ts,tsx,cjs}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
)
