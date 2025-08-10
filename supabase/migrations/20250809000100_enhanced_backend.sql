-- Enhanced backend: views, RPCs, RLS, indexes, and credit card support
-- Safe for local application; idempotent where possible

-- 1) Columns and basic structures
alter table public.accounts
  add column if not exists billing_cycle_day integer check (billing_cycle_day between 1 and 31);

-- 2) Views for balances and reserved amounts
drop view if exists public.account_balances cascade;
drop view if exists public.account_reserved cascade;
create or replace view public.account_balances as
select
  a.id as account_id,
  a.user_id,
  a.family_id,
  a.nome,
  a.tipo,
  coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2) as saldo_atual
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id, a.user_id, a.family_id, a.nome, a.tipo;

create or replace view public.account_reserved as
select
  a.id as account_id,
  coalesce(sum(ga.valor), 0)::numeric(15,2) as total_reservado
from public.accounts a
left join public.goal_allocations ga on ga.account_id = a.id
group by a.id;

-- 3) Helper: ensure category by name for a user
create or replace function public.ensure_category_for_user(p_user_id uuid, p_name text, p_color text default '#6B7280')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.categories where user_id = p_user_id and nome = p_name limit 1;
  if v_id is null then
    insert into public.categories (id, nome, cor, user_id)
    values (gen_random_uuid(), p_name, coalesce(p_color, '#6B7280'), p_user_id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- 4) RPC: get balances and reserved for current user (drop old signatures to allow return type changes)
drop function if exists public.get_user_account_balances();
drop function if exists public.get_user_account_reserved();
drop function if exists public.get_user_accounts_with_balances(uuid);
drop function if exists public.get_family_accounts_with_balances(uuid);

create or replace function public.get_user_account_balances()
returns table(account_id uuid, saldo_atual numeric)
language sql
security definer
set search_path = public
as $$
  select ab.account_id, ab.saldo_atual
  from public.account_balances ab
  join public.accounts a on a.id = ab.account_id
  where a.user_id = auth.uid() and a.family_id is null;
$$;

create or replace function public.get_user_account_reserved()
returns table(account_id uuid, total_reservado numeric)
language sql
security definer
set search_path = public
as $$
  select ar.account_id, ar.total_reservado
  from public.account_reserved ar
  join public.accounts a on a.id = ar.account_id
  where a.user_id = auth.uid() and a.family_id is null;
$$;

-- 5) RPC: get accounts with balances (personal)
create or replace function public.get_user_accounts_with_balances(p_user_id uuid)
returns table(
  account_id uuid,
  user_id uuid,
  family_id uuid,
  nome text,
  tipo text,
  saldo_atual numeric,
  total_reservado numeric,
  saldo_disponivel numeric
)
language sql
security definer
set search_path = public
as $$
  select 
    a.id as account_id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    ab.saldo_atual,
    coalesce(ar.total_reservado, 0)::numeric(15,2) as total_reservado,
    (ab.saldo_atual - coalesce(ar.total_reservado, 0))::numeric(15,2) as saldo_disponivel
  from public.accounts a
  left join public.account_balances ab on ab.account_id = a.id
  left join public.account_reserved ar on ar.account_id = a.id
  where a.user_id = p_user_id and a.family_id is null
  order by a.nome;
$$;

-- 6) RPC: get accounts with balances (family)
create or replace function public.get_family_accounts_with_balances(p_user_id uuid)
returns table(
  account_id uuid,
  user_id uuid,
  family_id uuid,
  nome text,
  tipo text,
  saldo_atual numeric,
  total_reservado numeric,
  saldo_disponivel numeric
)
language sql
security definer
set search_path = public
as $$
  select 
    a.id as account_id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    ab.saldo_atual,
    coalesce(ar.total_reservado, 0)::numeric(15,2) as total_reservado,
    (ab.saldo_atual - coalesce(ar.total_reservado, 0))::numeric(15,2) as saldo_disponivel
  from public.accounts a
  left join public.account_balances ab on ab.account_id = a.id
  left join public.account_reserved ar on ar.account_id = a.id
  where a.family_id in (
    select fm.family_id from public.family_members fm where fm.user_id = p_user_id
  )
  order by a.nome;
$$;

-- 7) RPC: update aggregated saldo column for compatibility
drop function if exists public.update_account_balance(uuid);
create or replace function public.update_account_balance(account_id_param uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(15,2) := 0;
begin
  select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2)
    into v_balance
  from public.transactions t
  where t.account_id = account_id_param;

  update public.accounts set saldo = v_balance where id = account_id_param;
  return true;
end;
$$;

-- 8) RPC: set regular account balance (creates one adjustment transaction)
drop function if exists public.set_regular_account_balance(uuid, uuid, numeric);
create or replace function public.set_regular_account_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_new_balance numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curr numeric(15,2) := 0;
  v_diff numeric(15,2) := 0;
  v_cat uuid;
  v_tipo text;
  v_tx_id uuid;
  v_is_owner boolean := false;
begin
  -- validate ownership
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner
  from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    raise exception 'Not allowed';
  end if;

  select saldo_atual into v_curr from public.account_balances where account_id = p_account_id;
  v_diff := coalesce(p_new_balance,0) - coalesce(v_curr,0);

  if v_diff = 0 then
    return null;
  end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Ajuste', '#6B7280');
  v_tipo := case when v_diff > 0 then 'receita' else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (
    gen_random_uuid(), p_user_id, p_account_id, v_cat, abs(v_diff),
    'Ajuste de saldo', current_date, v_tipo
  ) returning id into v_tx_id;

  perform public.update_account_balance(p_account_id);
  return v_tx_id;
end;
$$;

-- 9) RPC: create transfer transaction (two mirror tx)
drop function if exists public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date);
create or replace function public.create_transfer_transaction(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_user_id uuid,
  p_categoria_id uuid,
  p_description text,
  p_data date
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_owner boolean := false;
  v_to_owner boolean := false;
  v_tx_out uuid;
  v_tx_in uuid;
begin
  if p_from_account_id = p_to_account_id then
    return json_build_object('error', 'same_account');
  end if;
  if coalesce(p_amount,0) <= 0 then
    return json_build_object('error', 'invalid_amount');
  end if;

  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_from_owner from public.accounts a where a.id = p_from_account_id;
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_to_owner from public.accounts a where a.id = p_to_account_id;

  if not v_from_owner or not v_to_owner then
    return json_build_object('error', 'not_allowed');
  end if;

  -- saída
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_from_account_id, p_categoria_id, p_amount, coalesce(p_description,'Transferência'), p_data, 'despesa')
  returning id into v_tx_out;

  -- entrada
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_to_account_id, p_categoria_id, p_amount, coalesce(p_description,'Transferência'), p_data, 'receita')
  returning id into v_tx_in;

  perform public.update_account_balance(p_from_account_id);
  perform public.update_account_balance(p_to_account_id);
  return json_build_object('ok', true, 'out', v_tx_out, 'in', v_tx_in);
end;
$$;

-- 10) Credit card helpers
drop function if exists public.handle_credit_card_account(uuid, uuid, text);
create or replace function public.handle_credit_card_account(
  p_account_id uuid,
  p_user_id uuid,
  p_operation text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean := false;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then return false; end if;

  -- Placeholder: could initialize metadata; keep idempotent
  update public.accounts set billing_cycle_day = coalesce(billing_cycle_day, 1) where id = p_account_id;
  return true;
end;
$$;

-- 11) Credit card transaction handler
drop function if exists public.handle_credit_card_transaction(uuid, uuid, uuid, numeric, text, date, text, uuid);
create or replace function public.handle_credit_card_transaction(
  p_user_id uuid,
  p_account_id uuid,
  p_categoria_id uuid,
  p_valor numeric,
  p_descricao text,
  p_data date,
  p_tipo text,
  p_goal_id uuid default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    return json_build_object('error', 'not_allowed');
  end if;

  v_tipo := case when p_tipo in ('receita','despesa') then p_tipo else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, p_categoria_id, abs(p_valor), coalesce(p_descricao,'Movimento cartão'), p_data, v_tipo)
  returning id into v_tx_id;

  if p_goal_id is not null then
    insert into public.goal_allocations (id, goal_id, account_id, valor)
    values (gen_random_uuid(), p_goal_id, p_account_id, abs(p_valor));
  end if;

  perform public.update_account_balance(p_account_id);
  return json_build_object('transaction_id', v_tx_id);
end;
$$;

-- 12) Manage credit card balance
drop function if exists public.manage_credit_card_balance(uuid, uuid, numeric);
create or replace function public.manage_credit_card_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_new_balance numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curr numeric(15,2) := 0;
  v_diff numeric(15,2) := 0;
  v_cat uuid;
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    raise exception 'Not allowed';
  end if;

  select saldo_atual into v_curr from public.account_balances where account_id = p_account_id;
  v_diff := coalesce(p_new_balance,0) - coalesce(v_curr,0);
  if v_diff = 0 then return null; end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Ajuste', '#6B7280');
  v_tipo := case when v_diff > 0 then 'receita' else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, v_cat, abs(v_diff), 'Ajuste de saldo (cartão)', current_date, v_tipo)
  returning id into v_tx_id;

  perform public.update_account_balance(p_account_id);
  return v_tx_id;
end;
$$;

-- 7) RPC: create regular transaction (adjusted for goal allocations by account)
drop function if exists public.create_regular_transaction(uuid, uuid, uuid, numeric, text, date, text, uuid);
create or replace function public.create_regular_transaction(
  p_user_id uuid,
  p_account_id uuid,
  p_categoria_id uuid,
  p_valor numeric,
  p_descricao text,
  p_data date,
  p_tipo text,
  p_goal_id uuid default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    return json_build_object('error', 'not_allowed');
  end if;

  v_tipo := case when p_tipo in ('receita','despesa') then p_tipo else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, p_categoria_id, abs(p_valor), coalesce(p_descricao,'Movimento regular'), p_data, v_tipo)
  returning id into v_tx_id;

  if p_goal_id is not null then
    insert into public.goal_allocations (id, goal_id, account_id, valor)
    values (gen_random_uuid(), p_goal_id, p_account_id, abs(p_valor));
  end if;

  perform public.update_account_balance(p_account_id);
  return json_build_object('transaction_id', v_tx_id);
end;
$$;

-- 11) Pay credit card from bank account
drop function if exists public.pay_credit_card_from_account(uuid, uuid, uuid, numeric, date, text);
create or replace function public.pay_credit_card_from_account(
  p_user_id uuid,
  p_card_account_id uuid,
  p_bank_account_id uuid,
  p_amount numeric,
  p_date date,
  p_descricao text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean := false;
  v_cat uuid;
  v_desc text := coalesce(p_descricao, 'Pagamento de cartão por transferência');
  v_out uuid;
  v_in uuid;
begin
  if coalesce(p_amount,0) <= 0 then return false; end if;

  -- ownership
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_card_account_id;
  if not v_is_owner then return false; end if;
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_bank_account_id;
  if not v_is_owner then return false; end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Transferência', '#3B82F6');

  -- saída da conta bancária
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_bank_account_id, v_cat, p_amount, v_desc, p_date, 'despesa')
  returning id into v_out;

  -- entrada no cartão (reduz dívida)
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_card_account_id, v_cat, p_amount, v_desc, p_date, 'receita')
  returning id into v_in;

  perform public.update_account_balance(p_bank_account_id);
  perform public.update_account_balance(p_card_account_id);
  return true;
end;
$$;

-- 11.x) Credit card summary
drop function if exists public.get_credit_card_summary(uuid);
create or replace function public.get_credit_card_summary(
  p_account_id uuid
) returns table(
  saldo numeric,
  total_gastos numeric,
  total_pagamentos numeric,
  status text,
  ciclo_inicio text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_day int := 1;
  v_today date := current_date;
  v_cycle_start date;
begin
  select coalesce(billing_cycle_day, 1) into v_cycle_day from public.accounts where id = p_account_id;
  v_cycle_start := date_trunc('month', v_today) + ((v_cycle_day - 1) || ' days')::interval;
  if v_today < v_cycle_start then
    v_cycle_start := (date_trunc('month', v_today) - interval '1 month') + ((v_cycle_day - 1) || ' days')::interval;
  end if;

  return query
  with tx as (
    select * from public.transactions where account_id = p_account_id and data >= v_cycle_start::date
  )
  select 
    (select saldo_atual from public.account_balances where account_id = p_account_id) as saldo,
    coalesce((select sum(valor) from tx where tipo = 'despesa'),0)::numeric(15,2) as total_gastos,
    coalesce((select sum(valor) from tx where tipo = 'receita'),0)::numeric(15,2) as total_pagamentos,
    case when (select saldo_atual from public.account_balances where account_id = p_account_id) <= 0 then 'EM_DÍVIDA' else 'OK' end as status,
    to_char(v_cycle_start, 'YYYY-MM-DD') as ciclo_inicio;
end;
$$;

-- 11) Transactions list (personal/family)
drop function if exists public.get_personal_transactions();
drop function if exists public.get_family_transactions();
create or replace function public.get_personal_transactions()
returns setof public.transactions
language sql
security definer
set search_path = public
as $$
  select * from public.transactions t
  where t.user_id = auth.uid() and t.family_id is null
  order by t.data desc, t.created_at desc;
$$;

create or replace function public.get_family_transactions()
returns setof public.transactions
language sql
security definer
set search_path = public
as $$
  select * from public.transactions t
  where t.family_id in (select family_id from public.family_members where user_id = auth.uid())
  order by t.data desc, t.created_at desc;
$$;

-- 12) Family data: goals, budgets, KPIs
drop function if exists public.get_family_goals(uuid);
drop function if exists public.get_family_budgets(uuid);
drop function if exists public.get_family_kpis();
create or replace function public.get_family_goals(p_user_id uuid)
returns setof public.goals
language sql
security definer
set search_path = public
as $$
  select g.* from public.goals g
  where g.family_id in (select fm.family_id from public.family_members fm where fm.user_id = p_user_id);
$$;

create or replace function public.get_family_budgets(p_user_id uuid)
returns setof public.budgets
language sql
security definer
set search_path = public
as $$
  select b.* from public.budgets b
  where b.family_id in (select fm.family_id from public.family_members fm where fm.user_id = p_user_id);
$$;

create or replace function public.get_family_kpis()
returns table(
  total_balance numeric,
  credit_card_debt numeric,
  top_goal_progress numeric,
  monthly_savings numeric,
  goals_account_balance numeric,
  total_goals_value numeric,
  goals_progress_percentage numeric,
  total_members int,
  pending_invites int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with my_families as (
    select fm.family_id from public.family_members fm where fm.user_id = auth.uid()
  ),
  fam_accounts as (
    select * from public.accounts a where a.family_id in (select family_id from my_families)
  ),
  balances as (
    select ab.* from public.account_balances ab join fam_accounts a on a.id = ab.account_id
  ),
  tx as (
    select t.* from public.transactions t join fam_accounts a on a.id = t.account_id
  ),
  tx_month as (
    select * from tx where date_trunc('month', data) = date_trunc('month', current_date)
  ),
  cat_transfer as (
    select id from public.categories where nome ilike 'transfer%'
  ),
  tx_stats as (
    select 
      coalesce(sum(case when t.tipo='receita' and t.categoria_id not in (select id from cat_transfer) then t.valor else 0 end),0) as receitas,
      coalesce(sum(case when t.tipo='despesa' and t.categoria_id not in (select id from cat_transfer) then t.valor else 0 end),0) as despesas
    from tx_month t
  ),
  goals as (
    select g.*, least(case when g.valor_objetivo>0 then (g.valor_atual/g.valor_objetivo)*100 else 0 end, 100) as progress
    from public.goals g where g.family_id in (select family_id from my_families)
  )
  select 
    coalesce(sum(b.saldo_atual),0)::numeric(15,2) as total_balance,
    coalesce(sum(case when a.tipo = 'cartão de crédito' then least(b.saldo_atual,0) else 0 end) * -1, 0)::numeric(15,2) as credit_card_debt,
    coalesce(max(goals.progress),0)::numeric(5,2) as top_goal_progress,
    (select (tx_stats.receitas - tx_stats.despesas) from tx_stats)::numeric(15,2) as monthly_savings,
    0::numeric(15,2) as goals_account_balance,
    coalesce(sum((select valor_objetivo from public.goals gg where gg.id = g.id)),0)::numeric(15,2) as total_goals_value,
    coalesce(avg(goals.progress),0)::numeric(5,2) as goals_progress_percentage,
    coalesce((select count(*) from public.family_members fm join my_families f on f.family_id = fm.family_id),0)::int as total_members,
    0::int as pending_invites;
end;
$$;

-- 13) Delete account with related data
drop function if exists public.delete_account_with_related_data(uuid, uuid);
create or replace function public.delete_account_with_related_data(
  p_account_id uuid,
  p_user_id uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean := false;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then return json_build_object('success', false, 'error', 'not_allowed'); end if;

  delete from public.goal_allocations where account_id = p_account_id;
  delete from public.transactions where account_id = p_account_id;
  delete from public.accounts where id = p_account_id;
  return json_build_object('success', true);
end;
$$;

-- 14) Profiles trigger (optional)
-- Drop trigger before function to avoid dependency errors
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, updated_at) values (new.id, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 15) Basic policies (RLS)
-- Allow owners and family members to read account-related data
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'accounts_select_policy'
  ) THEN
    EXECUTE 'create policy accounts_select_policy on public.accounts
      for select using (
        user_id = auth.uid() or (
          family_id is not null and exists (
            select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = accounts.family_id
          )
        )
      )';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'accounts_insert_policy'
  ) THEN
    EXECUTE 'create policy accounts_insert_policy on public.accounts
      for insert with check (user_id = auth.uid())';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'accounts_update_policy'
  ) THEN
    EXECUTE 'create policy accounts_update_policy on public.accounts
      for update using (user_id = auth.uid())';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'accounts_delete_policy'
  ) THEN
    EXECUTE 'create policy accounts_delete_policy on public.accounts
      for delete using (user_id = auth.uid())';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_select_policy'
  ) THEN
    EXECUTE 'create policy transactions_select_policy on public.transactions
      for select using (
        user_id = auth.uid() or (
          family_id is not null and exists (
            select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = transactions.family_id
          )
        )
      )';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_insert_policy'
  ) THEN
    EXECUTE 'create policy transactions_insert_policy on public.transactions
      for insert with check (
        user_id = auth.uid() or exists (
          select 1 from public.accounts a where a.id = account_id and (a.user_id = auth.uid() or (a.family_id is not null and exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = a.family_id)))
        )
      )';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_update_policy'
  ) THEN
    EXECUTE 'create policy transactions_update_policy on public.transactions
      for update using (user_id = auth.uid())';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_delete_policy'
  ) THEN
    EXECUTE 'create policy transactions_delete_policy on public.transactions
      for delete using (user_id = auth.uid())';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_select_policy'
  ) THEN
    EXECUTE 'create policy categories_select_policy on public.categories
      for select using (
        user_id = auth.uid() or (
          family_id is not null and exists (
            select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = categories.family_id
          )
        )
      )';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_crud_policy'
  ) THEN
    EXECUTE 'create policy categories_crud_policy on public.categories
      for all using (user_id = auth.uid()) with check (user_id = auth.uid())';
  END IF;
END
$do$;

-- 16) Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select on table public.account_balances to authenticated;
grant select on table public.account_reserved to authenticated;

-- grant execute on functions
grant execute on function public.get_user_account_balances() to authenticated;
grant execute on function public.get_user_account_reserved() to authenticated;
grant execute on function public.get_user_accounts_with_balances(uuid) to authenticated;
grant execute on function public.get_family_accounts_with_balances(uuid) to authenticated;
grant execute on function public.set_regular_account_balance(uuid, uuid, numeric) to authenticated;
grant execute on function public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date) to authenticated;
grant execute on function public.handle_credit_card_account(uuid, uuid, text) to authenticated;
grant execute on function public.handle_credit_card_transaction(uuid, uuid, uuid, numeric, text, date, text, uuid) to authenticated;
grant execute on function public.manage_credit_card_balance(uuid, uuid, numeric) to authenticated;
grant execute on function public.pay_credit_card_from_account(uuid, uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.get_credit_card_summary(uuid) to authenticated;
grant execute on function public.get_personal_transactions() to authenticated;
grant execute on function public.get_family_transactions() to authenticated;
grant execute on function public.get_family_goals(uuid) to authenticated;
grant execute on function public.get_family_budgets(uuid) to authenticated;
grant execute on function public.get_family_kpis() to authenticated;
grant execute on function public.delete_account_with_related_data(uuid, uuid) to authenticated; 