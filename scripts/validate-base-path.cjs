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

  try {
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

function fail(msg) {
  console.error(`[validate-base-path] ${msg}`);
  process.exit(1);
}

const base = process.env.VITE_BASE_PATH;
if (!base || typeof base !== 'string' || base.trim() === '') {
  fail('VITE_BASE_PATH não está definido. Defina "/" (domínio próprio) ou "/<repo>/" (GitHub Pages).');
}

if (!base.startsWith('/') || !base.endsWith('/')) {
  fail(`VITE_BASE_PATH inválido: "${base}". Deve começar e terminar com '/'. Exemplos: "/" ou "/repo/"`);
}

if (process.env.VALIDATE_FOR_PAGES === 'true') {
  const repoFull = process.env.GITHUB_REPOSITORY || '';
  const repo = repoFull.split('/')[1] || '';
  if (!repo) {
    fail('GITHUB_REPOSITORY não definido no ambiente.');
  }
  const isUserOrgPages = repo.endsWith('.github.io');
  const expected = isUserOrgPages ? '/' : `/${repo}/`;
  if (base !== expected) {
    fail(`VITE_BASE_PATH="${base}" não corresponde ao esperado para Pages. Esperado: "${expected}" (repo: ${repo}).`);
  }
}

console.log('[validate-base-path] OK'); 