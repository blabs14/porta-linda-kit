## Objetivo
Guia passo-a-passo para colocar a app em produção com Supabase e GitHub Actions/Pages, incluindo envs, CI, deploy e ajustes no painel do Supabase.

## Pré‑requisitos
- Repositório no GitHub com branch `main`.
- Projeto Supabase ativo (referência do projeto disponível).
- Chave `anon` do Supabase.

## 1) Secrets no GitHub (Settings → Secrets and variables → Actions)
- VITE_SUPABASE_URL = `https://<project-ref>.supabase.co`
- VITE_SUPABASE_ANON_KEY = `<anon_key>`
- VITE_BASE_PATH = `/` (domínio próprio) ou `/<repo>/` (GitHub Pages). Ex.: `/porta-linda-kit/`
- (Opcional para validação remota de migrações)
  - SUPABASE_ACCESS_TOKEN = `<token_da_cli>`
  - SUPABASE_PROJECT_ID = `<project-ref>`

## 2) CI (já incluído)
- Workflow de CI em `.github/workflows/ci.yml`:
  - Passos: checkout → Node + cache → instalar deps → instalar Supabase CLI → `npm run db:lint` → `npm run test:run` → `npm run build`.
  - Se secrets remotos existirem, corre `supabase login` + `link` e `supabase migration list --linked`.
- Comandos úteis locais:
```bash
npm run db:lint -s
npm run db:migrations -s
npm run test:run -s
npm run build -s
```

## 3) Deploy estático (GitHub Pages)
- Workflow de deploy em `.github/workflows/deploy.yml` (build + upload artefacto + deploy Pages).
- Em GitHub → Settings → Pages: Source = GitHub Actions.
- Secrets necessários: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_PATH`.

### 3.1) Domínio e base path
- A app já suporta base dinâmico via `VITE_BASE_PATH` no `vite.config.ts`:
  - Para domínio próprio: `VITE_BASE_PATH=/`
  - Para GitHub Pages: `VITE_BASE_PATH=/<repo>/` (ex.: `/porta-linda-kit/`)
- SPA fallback (404.html): já configurado no workflow de deploy (copia `index.html` → `404.html`).

## 4) Painel Supabase (produção)
### 4.1) Authentication → URL Configuration
- Site URL: `https://<domínio>`
- Additional Redirect URLs: adicionar os endpoints usados pelo frontend, por exemplo:
  - `https://<domínio>/login`
  - `https://<domínio>/callback`
  - Outros caminhos de autenticação que a app utilize

### 4.2) Authentication → Providers (se usar OAuth)
- Atualizar os Redirect URIs dos provedores (Google, GitHub, etc.) para o domínio de produção.

### 4.3) Chaves e segurança
- Frontend deve usar apenas `anon key` (já aplicado no projeto).
- Nunca expor `service_role` no frontend.

### 4.4) RLS (Row Level Security)
- Garantir RLS ATIVO e políticas corretas nas tabelas sensíveis:
  - `profiles`, `families`, `family_members`, `accounts`, `transactions`, `goals`, `goal_allocations`, `budgets`, `notifications`, etc.
- Verificar em Table editor → Policies que as regras filtram por `user_id`/`family_id` (conforme o desenho do schema).

## 5) Supabase CLI
- Atualização local (conforme SO): `https://supabase.com/docs/guides/cli/getting-started#installing`
- No CI, a versão recente é instalada automaticamente em cada run.

## 6) Validações pós‑deploy
- Autenticação (signup, login, reset password) a funcionar.
- Listagens: contas, transações, metas, orçamentos.
- Criação/edição/remoção de registos principais.
- Network: chamadas `https://<project-ref>.supabase.co` a devolver 2xx.
- PWA: `sw.js` gerado e a cachear chamadas ao Supabase (padrão dinâmico já configurado).

## 7) Troubleshooting rápido
- Build falha por env: definir `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_BASE_PATH` nos Secrets/ambiente.
- Rotas quebradas em GitHub Pages: confirmar `VITE_BASE_PATH=/<repo>/` e 404 fallback.
- Erros de permissão: rever RLS e claims do utilizador autenticado.
- Tipos desalinhados: `npm run types:gen` após alterações de schema.

## 8) Checklist final
- [ ] Secrets (URL, anon key e base path) definidos no GitHub
- [ ] CI a passar (lint, testes, build)
- [ ] Deploy Pages ativo com domínio definido
- [ ] Redirect URLs atualizados no Supabase
- [ ] Apenas `anon key` no frontend
- [ ] RLS ativo e validado nas tabelas sensíveis
- [ ] Testes manuais de autenticação e CRUD básicos ok 