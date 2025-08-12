set check_function_bodies = off;

-- Garantir helper (idempotente)
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

-- Remover policies antigas se existirem
DO $$
BEGIN
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_select') THEN
    execute 'drop policy "notifications_select" on public.notifications';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_insert') THEN
    execute 'drop policy "notifications_insert" on public.notifications';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_update') THEN
    execute 'drop policy "notifications_update" on public.notifications';
  END IF;
  IF exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications_delete') THEN
    execute 'drop policy "notifications_delete" on public.notifications';
  END IF;
END$$;

-- SELECT
create policy "notifications_select"
  on public.notifications
  for select to authenticated
  using (
    (user_id = auth.uid())
    or (family_id is not null and public.is_member_of_family(family_id, auth.uid()))
  );

-- INSERT
create policy "notifications_insert"
  on public.notifications
  for insert to authenticated
  with check (
    (user_id = auth.uid())
    or (family_id is not null and public.is_member_of_family(family_id, auth.uid()))
  );

-- UPDATE
create policy "notifications_update"
  on public.notifications
  for update to authenticated
  using (
    (user_id = auth.uid())
    or (family_id is not null and public.is_member_of_family(family_id, auth.uid()))
  )
  with check (
    (user_id = auth.uid())
    or (family_id is not null and public.is_member_of_family(family_id, auth.uid()))
  );

-- DELETE
create policy "notifications_delete"
  on public.notifications
  for delete to authenticated
  using (
    (user_id = auth.uid())
    or (family_id is not null and public.is_member_of_family(family_id, auth.uid()))
  ); 