# Deploy — Family Flow Finance

Use os guias e workflows prontos para levar a app a produção com Supabase e GitHub Pages.

- Leia primeiro: `INDEX.md`
- Guia rápido: `../DEPLOY.md`
- Checklist completa: `../PROD_DEPLOY_CHECKLIST.md`
- CI: `.github/workflows/ci.yml`
- Deploy Pages: `.github/workflows/deploy.yml`

Variáveis essenciais (Secrets GitHub):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BASE_PATH` — `/` (domínio próprio) ou `/<repo>/` (Pages)