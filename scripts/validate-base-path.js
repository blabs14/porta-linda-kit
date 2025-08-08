#!/usr/bin/env node

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