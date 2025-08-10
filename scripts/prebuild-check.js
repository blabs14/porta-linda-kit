#!/usr/bin/env node

// Carregar variáveis de ambiente de .env.local e .env
(function loadEnv() {
  const fs = require('fs');
  const path = require('path');

  const parseAndApply = (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let value = line.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (process.env[key] == null) {
          process.env[key] = value;
        }
      }
    } catch {
      // ignorar
    }
  };

  // Tentar com dotenv se existir
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    const cwd = process.cwd();
    dotenv.config({ path: path.join(cwd, '.env.local') });
    dotenv.config({ path: path.join(cwd, '.env') });
  } catch {
    const cwd = process.cwd();
    parseAndApply(path.join(cwd, '.env.local'));
    parseAndApply(path.join(cwd, '.env'));
  }
})();

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