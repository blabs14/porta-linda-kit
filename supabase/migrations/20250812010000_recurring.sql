-- Recurring rules and instances
-- 1) Regras
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('personal','family')),
  user_id uuid references auth.users not null,
  family_id uuid references public.families(id),
  payee text,
  description text,
  category_id uuid references public.categories(id),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  interval_unit text not null check (interval_unit in ('day','week','month','year')),
  interval_count int not null default 1 check (interval_count > 0),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  last_run_date date,
  status text not null default 'active' check (status in ('active','paused','canceled')),
  is_subscription boolean not null default false,
  vendor text,
  trial_end_date date,
  cancel_at_period_end boolean default false,
  payment_method text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope='personal' and family_id is null) or (scope='family' and family_id is not null))
);

-- 2) Instâncias geradas
create table if not exists public.recurring_instances (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.recurring_rules(id) on delete cascade,
  due_date date not null,
  period_key text not null,
  status text not null default 'scheduled' check (status in ('scheduled','posted','skipped','canceled')),
  amount_cents integer not null,
  currency text not null,
  created_at timestamptz not null default now(),
  unique (rule_id, period_key)
);

-- 3) Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_recurring_rules_updated_at on public.recurring_rules;
create trigger trg_recurring_rules_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

-- RLS
alter table public.recurring_rules enable row level security;
alter table public.recurring_instances enable row level security;

-- Helpers (idempotentes)
create or replace function public.is_member_of_family(p_family_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id
  );
$$;

create or replace function public.is_family_editor(p_family_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id and fm.role in ('edit','owner','admin')
  );
$$;

-- Policies recurring_rules
drop policy if exists rr_select_personal on public.recurring_rules;
create policy rr_select_personal on public.recurring_rules
for select using (
  scope='personal' and user_id = auth.uid()
);

drop policy if exists rr_select_family on public.recurring_rules;
create policy rr_select_family on public.recurring_rules
for select using (
  scope='family' and public.is_member_of_family(family_id, auth.uid())
);

drop policy if exists rr_mutate_personal on public.recurring_rules;
create policy rr_mutate_personal on public.recurring_rules
for all using (
  scope='personal' and user_id = auth.uid()
)
with check (
  scope='personal' and user_id = auth.uid()
);

drop policy if exists rr_mutate_family on public.recurring_rules;
create policy rr_mutate_family on public.recurring_rules
for all using (
  scope='family' and public.is_family_editor(family_id, auth.uid())
)
with check (
  scope='family' and public.is_family_editor(family_id, auth.uid())
);

-- Policies recurring_instances
create or replace view public._rr_rules_for_user as
select r.id as rule_id
from public.recurring_rules r
where (
  (r.scope='personal' and r.user_id = auth.uid())
  or (r.scope='family' and public.is_member_of_family(r.family_id, auth.uid()))
);

drop policy if exists ri_select on public.recurring_instances;
create policy ri_select on public.recurring_instances
for select using (
  exists (select 1 from public._rr_rules_for_user u where u.rule_id = recurring_instances.rule_id)
);

drop policy if exists ri_mutate on public.recurring_instances;
create policy ri_mutate on public.recurring_instances
for all using (
  exists (select 1 from public.recurring_rules r where r.id = recurring_instances.rule_id and (
    (r.scope='personal' and r.user_id = auth.uid())
    or (r.scope='family' and public.is_family_editor(r.family_id, auth.uid()))
  ))
)
with check (true); 