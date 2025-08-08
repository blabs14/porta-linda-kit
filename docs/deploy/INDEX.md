# Índice de Deploy

- Guias:
  - `../DEPLOY.md` — Guia rápido de deploy
  - `../PROD_DEPLOY_CHECKLIST.md` — Checklist completa de produção

- CI/CD:
  - `.github/workflows/ci.yml` — Lint de DB, testes e build
  - `.github/workflows/deploy.yml` — Deploy GitHub Pages (build + 404 fallback)

- Scripts úteis:
  - `scripts/prebuild-check.js` — valida envs obrigatórias do build
  - `scripts/validate-base-path.js` — valida `VITE_BASE_PATH` (/, /<repo>/)

- Variáveis de ambiente (Secrets GitHub):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_BASE_PATH` — `/` (domínio próprio) ou `/<repo>/` (Pages)
  - (Opcional) `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` — para migrações remotas no CI

- Supabase (produção) — Checklist:
  - Site URL + Redirect URLs (Auth)
  - Providers OAuth (se aplicável)
  - RLS ativo e políticas por `user_id`/`family_id`
  - Apenas `anon` key no frontend

- PWA/Build:
  - `vite.config.ts` — base dinâmica via `VITE_BASE_PATH`, cache Supabase por host
  - SPA fallback (404.html) já configurado no workflow de deploy

- Comandos frequentes:
```
npm run db:lint -s
npm run db:migrations -s
npm run test:run -s
npm run build -s
``` 