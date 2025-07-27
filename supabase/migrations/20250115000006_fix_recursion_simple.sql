-- Migração: Corrigir recursão infinita (versão simples)
-- Data: 2025-01-15

-- Corrigir apenas as políticas RLS que causam recursão infinita
-- sem tocar em constraints ou estruturas existentes

-- 1. Corrigir política RLS de family_members (causa principal da recursão)
DROP POLICY IF EXISTS family_members_select ON public.family_members;
CREATE POLICY family_members_select ON public.family_members 
FOR SELECT TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

-- 2. Corrigir políticas de transactions que usam get_user_families
DROP POLICY IF EXISTS transactions_select_family ON public.transactions;
CREATE POLICY transactions_select_family ON public.transactions 
FOR SELECT TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS transactions_insert_family ON public.transactions;
CREATE POLICY transactions_insert_family ON public.transactions 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS transactions_update_family ON public.transactions;
CREATE POLICY transactions_update_family ON public.transactions 
FOR UPDATE TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS transactions_delete_family ON public.transactions;
CREATE POLICY transactions_delete_family ON public.transactions 
FOR DELETE TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

-- 3. Corrigir políticas de goals
DROP POLICY IF EXISTS goals_select_family ON public.goals;
CREATE POLICY goals_select_family ON public.goals 
FOR SELECT TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS goals_insert_family ON public.goals;
CREATE POLICY goals_insert_family ON public.goals 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS goals_update_family ON public.goals;
CREATE POLICY goals_update_family ON public.goals 
FOR UPDATE TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS goals_delete_family ON public.goals;
CREATE POLICY goals_delete_family ON public.goals 
FOR DELETE TO authenticated 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  )
);

-- Fim da migração 