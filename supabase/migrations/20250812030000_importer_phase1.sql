-- Importer Phase 1: índices, triggers updated_at, view de resumo e helpers de UPSERT/dedupe
set search_path = public;

-- Garantir função de updated_at disponível
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 1) Adicionar coluna updated_at e triggers às tabelas do Importer
alter table if exists public.import_profiles add column if not exists updated_at timestamptz not null default now();
alter table if exists public.ingestion_jobs add column if not exists updated_at timestamptz not null default now();
alter table if exists public.ingestion_files add column if not exists updated_at timestamptz not null default now();
alter table if exists public.staging_transactions add column if not exists updated_at timestamptz not null default now();
alter table if exists public.receipts add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_import_profiles_updated_at on public.import_profiles;
create trigger trg_import_profiles_updated_at before update on public.import_profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_ingestion_jobs_updated_at on public.ingestion_jobs;
create trigger trg_ingestion_jobs_updated_at before update on public.ingestion_jobs for each row execute function public.set_updated_at();

drop trigger if exists trg_ingestion_files_updated_at on public.ingestion_files;
create trigger trg_ingestion_files_updated_at before update on public.ingestion_files for each row execute function public.set_updated_at();

drop trigger if exists trg_staging_transactions_updated_at on public.staging_transactions;
create trigger trg_staging_transactions_updated_at before update on public.staging_transactions for each row execute function public.set_updated_at();

drop trigger if exists trg_receipts_updated_at on public.receipts;
create trigger trg_receipts_updated_at before update on public.receipts for each row execute function public.set_updated_at();

-- 2) Índices para desempenho e relatórios
create index if not exists idx_ingestion_jobs_family_id on public.ingestion_jobs(family_id);
create index if not exists idx_ingestion_files_job_id on public.ingestion_files(job_id);
create index if not exists idx_staging_transactions_job_created on public.staging_transactions(job_id, created_at);
create index if not exists idx_staging_transactions_hash on public.staging_transactions(hash);
create index if not exists idx_staging_transactions_posted on public.staging_transactions(posted_txn_id);

-- 3) View de resumo por job
create or replace view public.v_ingestion_job_summary as
select
  j.id as job_id,
  count(s.*) as total,
  count(*) filter (where s.dedupe_status = 'unique') as unique,
  count(*) filter (where s.dedupe_status = 'duplicate') as duplicate,
  count(*) filter (where s.posted_txn_id is not null) as posted
from public.ingestion_jobs j
left join public.staging_transactions s on s.job_id = j.id
group by j.id;

-- 4) Helper de UPSERT idempotente em staging
create or replace function public.upsert_staging_transaction(
  p_job_id uuid,
  p_row_index int,
  p_raw_json jsonb,
  p_normalized_json jsonb,
  p_hash text,
  p_dedupe_status text default 'unknown'
) returns uuid
language sql
as $$
  insert into public.staging_transactions (job_id, row_index, raw_json, normalized_json, hash, dedupe_status)
  values (p_job_id, p_row_index, p_raw_json, p_normalized_json, p_hash, coalesce(p_dedupe_status, 'unknown'))
  on conflict (job_id, hash) do update
    set row_index = excluded.row_index,
        raw_json = excluded.raw_json,
        normalized_json = excluded.normalized_json,
        dedupe_status = excluded.dedupe_status,
        updated_at = now()
  returning id;
$$;

-- 5) Dedupe cruzado com transactions (por data e valor no mesmo escopo)
create or replace function public.refresh_staging_dedupe(p_job_id uuid)
returns void
language sql
as $$
  with job as (
    select id, scope, user_id, family_id from public.ingestion_jobs where id = p_job_id
  )
  update public.staging_transactions s
  set dedupe_status = case
    when exists (
      select 1
      from public.transactions t, job j
      where (
        (j.scope = 'personal' and t.user_id = j.user_id)
        or (j.scope = 'family' and t.family_id = j.family_id)
      )
      and t.data = (s.normalized_json->>'date')::date
      and t.valor = ((s.normalized_json->>'amount_cents')::int)::numeric / 100.0
    ) then 'duplicate'
    else 'unique'
  end,
  updated_at = now()
  where s.job_id = p_job_id;
$$; 