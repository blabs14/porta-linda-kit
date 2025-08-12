-- RLS fix: evitar recursão em policy de family_members usando função SECURITY DEFINER
set check_function_bodies = off;

-- Helper: verifica se um utilizador é membro de uma família
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

-- Substituir policy de SELECT em family_members para usar a função (evitando subselect à própria tabela sob RLS)
DO $$
BEGIN
  IF exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'family_members' and policyname = 'family_members_select_authenticated'
  ) THEN
    execute 'drop policy "family_members_select_authenticated" on public.family_members';
  END IF;
END$$;

create policy "family_members_select_authenticated"
  on public.family_members
  for select
  to authenticated
  using (
    auth.uid() is not null and public.is_member_of_family(family_id, auth.uid())
  );

-- Opcional: reforçar INSERT/UPDATE/DELETE de forma consistente (idempotente)
DO $$
BEGIN
  IF NOT exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'family_members' and policyname = 'family_members_insert_own'
  ) THEN
    execute $$create policy "family_members_insert_own"
      on public.family_members
      for insert to authenticated
      with check (
        auth.uid() is not null and user_id = auth.uid() and public.is_member_of_family(family_id, auth.uid())
      )$$;
  END IF;
  IF NOT exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'family_members' and policyname = 'family_members_update_own'
  ) THEN
    execute $$create policy "family_members_update_own"
      on public.family_members
      for update to authenticated
      using (
        auth.uid() is not null and public.is_member_of_family(family_id, auth.uid())
      )
      with check (
        auth.uid() is not null and public.is_member_of_family(family_id, auth.uid())
      )$$;
  END IF;
  IF NOT exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'family_members' and policyname = 'family_members_delete_own'
  ) THEN
    execute $$create policy "family_members_delete_own"
      on public.family_members
      for delete to authenticated
      using (
        auth.uid() is not null and public.is_member_of_family(family_id, auth.uid())
      )$$;
  END IF;
END$$; 