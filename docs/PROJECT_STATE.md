# Porta Linda Kit — Estado Atual do Projeto e Próximos Passos

Este documento dá contexto end‑to‑end do projeto (app completa) para qualquer dev poder continuar o trabalho com segurança e consistência. Abrange stack, arquitetura, domínios, segurança, RLS, Edge Functions, PWA/push, performance, testes/CI, e inclui a nova feature “Universal Importer”, com um plano de evolução.

## Stack & Convenções
- Frontend: React + TypeScript + Vite + shadcn/ui + TanStack Query
- Supabase: Auth, Postgres + RLS, Storage, Edge Functions
- Testes: Vitest (unit/integration), Cypress (E2E)
- Estilo: componentes modulares, funções puras e curtas, tipagem forte; validação Zod na fronteira
- Navegação: `/app/*` (dashboard/report), `/personal/*`, `/family/*`
- Segurança: RLS por tabela, helpers `public.is_member_of_family` e `public.is_family_editor` (SECURITY DEFINER)

## Arquitetura – vista de alto nível
- Frontend
  - Páginas principais: Dashboard/KPIs, Accounts/Transactions/Goals/Budgets, Reports/Insights, Settings, Recorrentes, Importer
  - UI reutilizável (shadcn/ui) e Tooltips/A11y ajustados
  - Code‑splitting (Vite manualChunks) e prefetch de rotas críticas
  - PWA com SW em dev e produção, push notifications
- Backend (Supabase)
  - DB com RLS consistente (pessoal vs familiar + roles viewer/edit/owner)
  - Edge Functions: validação/negócio fora do cliente (p.ex., notificações, importer, recorrentes)
  - Storage: `imports/` e `receipts/` (Importer)

## Domínios & Estado Atual (resumo)
- Autenticação: Auth + `RequireAuth`, context `AuthContext`; rotas públicas `/login`, `/register`, `/forgot-password`
- Pessoal (Personal): dashboard, contas, transações, objetivos, orçamentos, insights, recorrentes, importar
- Familiar (Family): idem, com RLS por família; convites, membros, definições
- KPIs/Reports: backend‑first com RPCs (`get_personal_kpis`, `get_family_kpis`, breakdown/categories); drill‑down e exclusão de transferências; tooltips
- Notificações/Reminders: push local e Edge para envio; toggle em Settings; CORS ajustado
- Recorrentes: schema `recurring_rules/instances`, Edge `recurrents_run` + scheduler (cron|scheduled function), UI listagem/ação rápida; confirmações modais e toasts
- Performance: code‑split granular (`react-vendor`, `react-query`, `router`, `icons`, chunks por área), prefetch nas tabs e navegação; bundle‑visualizer opcional
- Importer (novo): ver secção dedicada abaixo

## Segurança & RLS (padrões)
- Helpers: `public.is_member_of_family(family_id, user_id)` e `public.is_family_editor(family_id, user_id)`
- Políticas consistentes para: `families`, `family_members`, `invites`, `accounts`, `goals`, `budgets`, `transactions`, `notifications`, `reminders`, `audit_logs`, `recurring_*`, `importer_*`
- Boas práticas: sem acesso cross‑family; pessoal só `auth.uid()`; operações de escrita apenas `edit/owner`

## Edge Functions existentes (amostra)
- `recurrents_run`: gera instâncias (idempotência por unique `(rule_id,period_key)`); scheduler diário
- Push: `push-delivery` com CORS dinâmico e Vary: Origin
- Importer: `ingest_csv` (CSV real), `ingest_receipt` (OCR mock), `post_staging` (insere em `transactions`)

## PWA & Push
- SW registado (dev+prod), CSP ajustada (`worker-src 'self' blob:`)
- Botão “Enviar push de teste” em Settings

## Performance
- Code splitting por domínios; prefetch nas entradas de navegação
- Orçamento de chunks (warning) e visualizer opcional

## Testes & CI (estado)
- Vitest: base configurada
- Cypress: smoke em Recorrentes; pipeline CI recomendado (typecheck, lint, unit+integração, E2E, coverage)
- A11y: a reforçar (axe em páginas críticas)

---

## Universal Importer — Estado Atual
- DB & RLS criados: `import_profiles`, `ingestion_jobs`, `ingestion_files`, `staging_transactions`, `receipts`
- UI: `/personal/importar` e `/family/importar` (upload real), wizard CSV (mapping básico) e recibo (OCR mock), revisão e postar
- Edge: `ingest_csv` (CSV), `ingest_receipt` (mock OCR), `post_staging` (insere em `transactions` e marca `posted_txn_id`)
- Escopo automático pela área (pessoal/familiar)

### Em falta (Importer)
- Índices (job_id/hash/created_at), trigger `updated_at`, view `v_ingestion_job_summary`
- UPSERT `(job_id,hash)` + dedupe cruzado com `transactions`
- XLSX real (SheetJS ou conversão); CSV streaming
- OCR cloud provider (via secrets) com fallback mock
- `post_staging`: `update_account_balance(account_id)` e validações de `account_id/categoria_id`
- UI revisão: paginação, filtros duplicado/único/postado; edição inline categoria/conta; `import_profiles` guardados por banco
- Validações Zod, rate‑limit, logs estruturados, `stats_json` completo; testes unit+integração+E2E; Axe

### Secrets (Edge Functions)
- OCR_PROVIDER=mock | cloud
- OCR_CLOUD_ENDPOINT, OCR_CLOUD_KEY (se cloud)
- SERVICE_ROLE_KEY (já configurado)

---

## Próximas Fases (toda a app + Importer)

### Fase 1 — DB segurança & métricas
- [ ] Índices: `ingestion_files(job_id)`, `staging_transactions(job_id, created_at)`, `staging_transactions(hash)`, `ingestion_jobs(family_id)`
- [ ] Trigger `updated_at` nas tabelas do Importer
- [ ] View `v_ingestion_job_summary(job_id, total, unique, duplicate, posted)` e migração de constraints (text length)
- [ ] UPSERT `(job_id,hash)` e dedupe cruzado com `transactions`

### Fase 2 — Edge hardening
- [ ] Zod nas funções; validações de MIME/tamanho; logs estruturados (job_id/file_id/user_id/family_id)
- [ ] `stats_json` detalhado (lidas/válidas/duplicadas/postadas)
- [ ] Rate‑limit simples (tabela `rate_limiter`, janela curta por user_id)
- [ ] `post_staging`: chamar `update_account_balance(account_id)` quando existir

### Fase 3 — Parser XLSX & OCR real
- [ ] SheetJS para `.xlsx` (fallback se runtime não suportar) e CSV streaming
- [ ] OCR provider cloud: ler secrets; fallback mock (default)

### Fase 4 — UI revisão
- [ ] Paginação/filtros na `StagingTable`; edição inline categoria/conta/descrição
- [ ] Guardar e reutilizar `import_profiles` por `bank_name`

### Fase 5 — Testes, CI, Docs
- [ ] Unit: `inferCsv`, `parseXlsx`, `parseDatePt`, `normalizeRow`, `computeHash`, idempotência
- [ ] Integração: `ingest_csv`/`ingest_receipt` com fixtures; RLS com `auth.uid()`
- [ ] E2E: CSV e Recibo ponta‑a‑ponta; Axe sem erros críticos
- [ ] CI: typecheck, lint, unit+integração, E2E, coverage (≥70%)
- [ ] README/Docs: “Universal Importer” e manual de operação (jobs, retries, reprocess)

---

## Operação & Dev
- Dev server: `npm run dev`, Cypress: `npm run cy:open`/`npm run test:e2e`
- Edge deploy: `supabase functions deploy <name>` (ou Studio); redespletar após mudar secrets
- Buckets: `imports/`, `receipts/` — paths por escopo: `bucket/<user_or_family>/<YYYY>/<MM>/<uuid>.<ext>`
- Erros/Logs: ativar Sentry (front+edge) e usar logs estruturados nas funções

## Riscos & Mitigações
- Ficheiros grandes → streaming + processamento assíncrono
- OCR externo → data residency e retenção (preferir UE), fallback mock
- Dedupe incompleto → reforçar hash + heurísticas (merchant/descrição normalizados)

## Definition of Done (geral)
- RLS coberta e testada; idempotência por hash
- UI com A11y básicos; E2E a passar (CSV/Recibo)
- Logs + Sentry com contexto (job_id/file_id)
- CI verde; docs/README atualizados

## Reflexão (design & escalabilidade)
A arquitetura foi pensada para isolar importação e lançamento em fases: upload → parse/normalize → staging → revisão → post, preservando reentrância e auditabilidade via jobs/staging e RLS estrita. Isto permite escalar parsing/normalização com scheduled functions ou filas, e mudar o OCR por provider sem tocar no resto do pipeline. Próximos passos naturais incluem XLSX/streaming, OCR real, regras de categorização automáticas e reconciliação/saldos, preparando terreno para integrações bancárias. 