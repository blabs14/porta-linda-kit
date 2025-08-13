-- Universal Importer: schema + RLS
set search_path = public;

-- 1) Perfis de mapeamento
create table if not exists public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  bank_name text not null,
  mapping_json jsonb not null,
  sample_hash text,
  created_at timestamptz not null default now(),
  unique (user_id, bank_name)
);

-- 2) Jobs
create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('personal','family')),
  user_id uuid not null references auth.users(id),
  family_id uuid references public.families(id),
  source text not null check (source in ('csv','excel','receipt')),
  status text not null default 'uploaded' check (status in ('uploaded','parsed','normalized','deduped','reviewed','posted','failed')),
  stats_json jsonb default '{}'::jsonb,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  check ((scope='personal' and family_id is null) or (scope='family' and family_id is not null))
);

-- 3) Ficheiros do job
create table if not exists public.ingestion_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  ocr_json jsonb,
  created_at timestamptz not null default now()
);

-- 4) Staging normalizado
create table if not exists public.staging_transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  row_index int,
  raw_json jsonb not null,
  normalized_json jsonb not null,
  hash text not null,
  dedupe_status text not null default 'unknown' check (dedupe_status in ('unknown','duplicate','unique')),
  posted_txn_id uuid,
  created_at timestamptz not null default now(),
  unique (job_id, hash)
);

-- 5) Recibos (opcional)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.ingestion_jobs(id) on delete set null,
  file_id uuid references public.ingestion_files(id) on delete set null,
  storage_path text not null,
  vendor text,
  total_cents int,
  currency text default 'EUR',
  date date,
  tax_cents int,
  ocr_json jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.import_profiles enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_files enable row level security;
alter table public.staging_transactions enable row level security;
alter table public.receipts enable row level security;

-- Policies: perfis (pessoais)
drop policy if exists ip_select on public.import_profiles;
create policy ip_select on public.import_profiles for select using (user_id = auth.uid());

drop policy if exists ip_mutate on public.import_profiles;
create policy ip_mutate on public.import_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Jobs
create policy jobs_select_personal on public.ingestion_jobs for select using (scope='personal' and user_id = auth.uid());
create policy jobs_select_family on public.ingestion_jobs for select using (
  scope='family' and public.is_member_of_family(family_id, auth.uid())
);
create policy jobs_mutate_personal on public.ingestion_jobs for all using (scope='personal' and user_id = auth.uid()) with check (scope='personal' and user_id = auth.uid());
create policy jobs_mutate_family on public.ingestion_jobs for all using (
  scope='family' and public.is_family_editor(family_id, auth.uid())
) with check (
  scope='family' and public.is_family_editor(family_id, auth.uid())
);

-- Files
create policy files_access on public.ingestion_files for all using (
  exists (select 1 from public.ingestion_jobs j where j.id = job_id and (j.user_id=auth.uid() or public.is_member_of_family(j.family_id, auth.uid())))
);

-- Staging
create policy staging_access on public.staging_transactions for all using (
  exists (select 1 from public.ingestion_jobs j where j.id = job_id and (j.user_id=auth.uid() or public.is_member_of_family(j.family_id, auth.uid())))
);

-- Receipts
create policy receipts_access on public.receipts for all using (
  exists (select 1 from public.ingestion_jobs j where j.id = job_id and (j.user_id=auth.uid() or public.is_member_of_family(j.family_id, auth.uid())))
); 