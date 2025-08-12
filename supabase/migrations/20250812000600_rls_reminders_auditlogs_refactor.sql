set check_function_bodies = off;

-- helpers
create or replace function public.is_member_of_family(
  p_family_id uuid,
  p_user_id uuid default auth.uid()
)
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

-- reminders: policies pessoais
DO $$
BEGIN
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='reminders' and policyname='reminders_select_own') THEN
    execute 'drop policy "reminders_select_own" on public.reminders';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='reminders' and policyname='reminders_insert_own') THEN
    execute 'drop policy "reminders_insert_own" on public.reminders';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='reminders' and policyname='reminders_update_own') THEN
    execute 'drop policy "reminders_update_own" on public.reminders';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='reminders' and policyname='reminders_delete_own') THEN
    execute 'drop policy "reminders_delete_own" on public.reminders';
  END IF;
END$$;

create policy "reminders_select_own" on public.reminders for select to authenticated using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders for insert to authenticated with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders for delete to authenticated using (auth.uid() = user_id);

-- audit_logs: sem coluna family_id; permitir acesso apenas ao autor do registo (user_id)
DO $$
BEGIN
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_select') THEN
    execute 'drop policy "audit_logs_select" on public.audit_logs';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_insert_simple') THEN
    execute 'drop policy "audit_logs_insert_simple" on public.audit_logs';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_update_simple') THEN
    execute 'drop policy "audit_logs_update_simple" on public.audit_logs';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_delete_simple') THEN
    execute 'drop policy "audit_logs_delete_simple" on public.audit_logs';
  END IF;
END$$;

create policy "audit_logs_select"
  on public.audit_logs
  for select to authenticated
  using (user_id = auth.uid());

create policy "audit_logs_insert"
  on public.audit_logs
  for insert to authenticated
  with check (auth.uid() is not null);

create policy "audit_logs_update"
  on public.audit_logs
  for update to authenticated
  using (user_id = auth.uid());

create policy "audit_logs_delete"
  on public.audit_logs
  for delete to authenticated
  using (user_id = auth.uid()); 