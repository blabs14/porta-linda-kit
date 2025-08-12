set check_function_bodies = off;

-- Helpers (idempotentes)
create or replace function public.is_member_of_family(
  p_family_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case when p_family_id is null then false else exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id
  ) end;
$$;

create or replace function public.is_family_admin(
  p_family_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case when p_family_id is null then false else exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id and (fm.role in ('owner','admin'))
  ) end;
$$;

-- Utility para dropar policy se existir
create or replace function public._drop_policy_if_exists(p_table regclass, p_policy text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = split_part(p_table::text, '.', 2) and policyname = p_policy) then
    execute format('drop policy %I on %s', p_policy, p_table::text);
  end if;
end;
$$;

-- accounts
select public._drop_policy_if_exists('public.accounts', 'accounts_select');
create policy "accounts_select" on public.accounts for select to authenticated using (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.accounts', 'accounts_insert');
create policy "accounts_insert" on public.accounts for insert to authenticated with check (
  family_id is null or public.is_family_admin(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.accounts', 'accounts_update');
create policy "accounts_update" on public.accounts for update to authenticated using (
  family_id is null or public.is_family_admin(family_id, auth.uid())
) with check (
  family_id is null or public.is_family_admin(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.accounts', 'accounts_delete');
create policy "accounts_delete" on public.accounts for delete to authenticated using (
  family_id is null or public.is_family_admin(family_id, auth.uid())
);

-- goals
select public._drop_policy_if_exists('public.goals', 'goals_select');
create policy "goals_select" on public.goals for select to authenticated using (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.goals', 'goals_mutate');
create policy "goals_mutate" on public.goals for all to authenticated using (
  family_id is null or public.is_family_admin(family_id, auth.uid())
) with check (
  family_id is null or public.is_family_admin(family_id, auth.uid())
);

-- budgets
select public._drop_policy_if_exists('public.budgets', 'budgets_select');
create policy "budgets_select" on public.budgets for select to authenticated using (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.budgets', 'budgets_mutate');
create policy "budgets_mutate" on public.budgets for all to authenticated using (
  family_id is null or public.is_family_admin(family_id, auth.uid())
) with check (
  family_id is null or public.is_family_admin(family_id, auth.uid())
);

-- transactions
select public._drop_policy_if_exists('public.transactions', 'transactions_select');
create policy "transactions_select" on public.transactions for select to authenticated using (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
);

select public._drop_policy_if_exists('public.transactions', 'transactions_mutate');
create policy "transactions_mutate" on public.transactions for all to authenticated using (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
) with check (
  family_id is null or public.is_member_of_family(family_id, auth.uid())
);

-- limpeza helper utilitário (opcional manter)
-- drop function if exists public._drop_policy_if_exists(regclass, text); 