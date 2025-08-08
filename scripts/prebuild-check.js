#!/usr/bin/env node

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');

if (missing.length > 0) {
  console.error('[prebuild] Variáveis de ambiente em falta:', missing.join(', '));
  console.error('[prebuild] Defina-as antes de executar o build.');
  process.exit(1);
} else {
  console.log('[prebuild] Ambiente OK');
} 