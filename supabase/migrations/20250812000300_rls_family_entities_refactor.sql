set check_function_bodies = off;

-- Helpers idempotentes
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

create or replace function public.is_family_admin(
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
    where fm.family_id = p_family_id and fm.user_id = p_user_id and (fm.role in ('owner','admin'))
  );
$$;

-- family_invites: SELECT
DO $$
BEGIN
  IF exists (
    select 1 from pg_policies where schemaname='public' and tablename='family_invites' and policyname='family_invites_select_authenticated'
  ) THEN
    execute 'drop policy "family_invites_select_authenticated" on public.family_invites';
  END IF;
END$$;

create policy "family_invites_select_authenticated"
  on public.family_invites
  for select to authenticated
  using (
    auth.uid() is not null and public.is_member_of_family(family_id, auth.uid())
  );

-- family_backups: UPDATE (admin/owner)
DO $$
BEGIN
  IF exists (
    select 1 from pg_policies where schemaname='public' and tablename='family_backups' and policyname='family_backups_update_policy'
  ) THEN
    execute 'drop policy "family_backups_update_policy" on public.family_backups';
  END IF;
END$$;

create policy "family_backups_update_policy"
  on public.family_backups
  for update to authenticated
  using (
    public.is_family_admin(family_id, auth.uid())
  ); 