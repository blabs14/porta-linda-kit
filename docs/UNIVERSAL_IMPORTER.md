# Universal Importer — Estado Atual e Próximos Passos

Este documento resume o estado atual da implementação do Importador Universal (extratos CSV/Excel e recibos com OCR), a arquitetura adotada, decisões de engenharia, e um plano claro de próximos passos para que qualquer dev possa continuar o trabalho com segurança.

## Objetivo

Ingerir ficheiros bancários (CSV/Excel) e recibos (imagem/PDF + OCR), normalizar para um formato comum, deduplicar, permitir revisão/edição em UI e postar transações nas tabelas finais, respeitando escopos Pessoal e Familiar (RLS).

## Arquitetura (visão geral)

- Frontend (React/TS + Vite + shadcn/ui)
  - Páginas: `/personal/importar` e `/family/importar`
  - Wizard CSV: Upload → Mapeamento → Ingestão → Revisão → Postar
  - Wizard Recibo: Upload → OCR → Revisão → Postar
- Supabase
  - DB: tabelas de perfis, jobs, ficheiros, staging e recibos (ver esquema)
  - Storage: buckets `imports/` e `receipts/`
  - Edge Functions: `ingest_csv`, `ingest_receipt`, `post_staging` (mock OCR + parser CSV funcional, XLSX em aberto)
  - RLS: por escopo (pessoal/família) e role (viewer/edit/owner)

## Estado Atual (implementado)

### Base de dados

Migração: `20250812020000_importer.sql`
- Tabelas
  - `import_profiles(id, user_id, bank_name, mapping_json, sample_hash, created_at)`
  - `ingestion_jobs(id, scope, user_id, family_id, source, status, stats_json, error, started_at, finished_at)`
  - `ingestion_files(id, job_id, storage_bucket, storage_path, original_filename, mime_type, size_bytes, sha256, ocr_json, created_at)`
  - `staging_transactions(id, job_id, row_index, raw_json, normalized_json, hash, dedupe_status, posted_txn_id, created_at)`
  - `receipts(id, job_id, file_id, storage_path, vendor, total_cents, currency, date, tax_cents, ocr_json, created_at)`
- RLS
  - Perfis: `select/mutate` do próprio (`user_id = auth.uid()`) 
  - Jobs: pessoal (`user_id = auth.uid()`), família (`is_member_of_family` / `is_family_editor`)
  - Files/Staging/Receipts: acesso se o utilizador puder ver o job (subselect ao job)

Notas:
- Índices e triggers extra ainda por aplicar (ver Próximos Passos)
- View de resumo ainda por criar (ver Próximos Passos)

### Storage

- Upload real suportado em UI (helpers `uploadToBucket`, `insertIngestionFile`)
- Buckets esperados: `imports` (CSV/XLSX) e `receipts` (imagens/PDF)

### Edge Functions

- `ingest_csv`
  - CSV: parser funcional (heurística separador, mapping básico), normaliza e insere em `staging_transactions`, atualiza `jobs.status` para `normalized` e `stats_json.rows`
  - XLSX: ainda não (planeado)
- `ingest_receipt`
  - OCR `mock`: extrai `{merchant,date,total}` simulado, normaliza e cria 1 linha em staging
  - Leitura de provider via secrets (planeado), mock por omissão (já suportado via OCR_PROVIDER=mock)
- `post_staging`
  - Cria entradas em `transactions` a partir de `normalized_json` (map básico por sinal) 
  - Marca `posted_txn_id`, fecha o job em `posted`

### UI/Serviços/Utils

- Páginas: `src/pages/importer.tsx` (wizard), `src/pages/Personal.tsx` e `src/pages/Family.tsx` (entradas de navegação)
- Componentes: `MappingForm`, `StagingTable`, `ReceiptPreview`
- Serviços: `src/services/importer.ts` (jobs/files/staging + Edge endpoints)
- Utils: `src/lib/importer.ts` (parseDatePt, normalizeRow, computeHash)

### Escopos & RLS

- `RecorrentsPage`/Importer fixam o escopo pela área (pessoal/familiar)
- RLS aplicada nas tabelas do Importer

## Em Falta / A aperfeiçoar

- Segurança & Dados
  - Índices extra (job_id/hash/created_at), triggers `updated_at`, view `v_ingestion_job_summary`
  - Constraints de tamanho/texto e checks de estado
  - UPSERT determinístico por `(job_id, hash)` e dedupe cruzado com `transactions`
- Edge Functions
  - Validação Zod de inputs (headers/body/query)
  - Rate‑limit simples (janela curta por user_id)
  - Logs estruturados (level, job_id, file_id, user_id, family_id)
  - `stats_json` detalhado (lidas/válidas/duplicadas/postadas)
  - `post_staging`: `update_account_balance` por `account_id`
- Parser & OCR
  - XLSX real (SheetJS no runtime Deno ou transformação prev.)
  - OCR cloud provider (secrets) com fallback mock
- UI revisão
  - Paginação, filtros (duplicado/único/postado), edição inline de `categoria_id`/`account_id`
  - Guardar `import_profiles` e reutilizar por banco
- Observabilidade & Testes
  - Sentry (front+edge), logs com contextos
  - Testes unit (parsers/normalizer/hash), integração (Functions) e E2E (CSV/Recibo ponta‑a‑ponta), Axe sem erros críticos
- Policies de Storage
  - Apenas dono/membro família lê; escrita só do próprio; whitelist MIME e limites de tamanho

## Próximos Passos (plano de execução)

1) DB & RLS (migr.)
- Índices: 
  - `ingestion_jobs(family_id)`
  - `ingestion_files(job_id)`
  - `staging_transactions(job_id, created_at)`, `staging_transactions(hash)`
- Trigger `updated_at` em jobs/files/staging/receipts
- View `v_ingestion_job_summary(job_id, total, unique, duplicate, posted)`
- Constraint: `check(status in ...)` já existe; adicionar limites de texto se necessário
- UPSERT `(job_id, hash)` (idempotência)

2) Edge hardening
- `zod` nas funções, validação MIME/tamanho, logs estruturados, `stats_json` completo, rate-limit (tabela `rate_limiter` com janela curta)
- `post_staging`: depois do insert, chamar `update_account_balance(account_id)` quando definido

3) Parser XLSX & OCR cloud
- XLSX: integrar SheetJS (ou fallback) com deteção de headers
- OCR provider: ler `OCR_PROVIDER`/`OCR_CLOUD_ENDPOINT`/`OCR_CLOUD_KEY` (mock/real)

4) UI revisão
- Paginação e filtros na `StagingTable`, edição inline de categoria/conta/descrição
- Gestão de `import_profiles` (guardar e aplicar por `bank_name`)

5) Testes & CI & Docs
- Unit: `inferCsv`, `parseXlsx`, `parseDatePt`, `normalizeRow`, `computeHash`, idempotência de upload
- Integração: executar `ingest_csv`/`ingest_receipt` contra DB de teste, verificar `stats_json` e RLS
- E2E: wizard CSV/Recibo ponta‑a‑ponta; Axe sem erros críticos
- CI: typecheck, lint, unit+integração, E2E headless, coverage (≥70% nos módulos críticos)
- README: secção “Universal Importer” (setup, limites, formatos suportados, OCR real)

## Configuração & Secrets

- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Edge Functions (Function Secrets):
  - `OCR_PROVIDER = mock | cloud`
  - `OCR_CLOUD_ENDPOINT` (se cloud)
  - `OCR_CLOUD_KEY` (se cloud)
  - `SERVICE_ROLE_KEY` (já configurado)
- Limites sugeridos: `MAX_CSV_MB`, `MAX_RECEIPT_MB`, `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`

## Scripts úteis (sugeridos)

- `npm run test:e2e` — Cypress headless com dev server
- `npm run cy:open` — Cypress UI
- `npm run typecheck`, `npm run lint`
- `supabase functions deploy <name>` — redeploy de funções (ou usar Editor)

## Fluxo de Smoke (manual rápido)

1) Pessoal → Importar → aba CSV → upload de CSV pequeno
2) Mapeamento básico (Data/Descrição/Montante) → Confirmar → Ingestão
3) Revisão → editar algum campo → selecionar linhas → “Adicionar transações”
4) Confirmar em `transactions`/UI
5) Recibo: upload → OCR (mock) → Revisão → Postar

## Decisões de Design (resumo)

- Pipeline baseado em jobs/staging: reentrante, idempotente e auditável
- Deduplicação por hash determinístico e UPSERT `(job_id,hash)`
- Escopo e RLS herdados do resto da app (pessoal/família)
- Edge Functions para isolamento e futura escalabilidade (Scheduled/async)

## Próximos passos estratégicos (escala)

- Parsing em streaming e processamento assíncrono por lotes para ficheiros grandes
- OCR real (Google/AWS/Azure) com quotas, retenção e data residency
- Regras de classificação (categoria/conta) por merchant/descrição (regex) e aprendizagem incremental
- Reconciliação com saldos/contas e ligações bancárias (open banking)

---

Este documento deve acompanhar os PRs e ser atualizado a cada fase concluída. Mantenha commits pequenos, tipagem forte e validação nas fronteiras. A integridade do sistema depende do respeito pelas RLS, idempotência por hash e logs/`stats_json` consistentes em todo o pipeline. 