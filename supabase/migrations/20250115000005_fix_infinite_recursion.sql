-- Migração: Corrigir recursão infinita em family_members
-- Data: 2025-01-15

-- O problema: A função get_user_families chama family_members diretamente,
-- mas a política RLS de family_members chama get_user_families, criando recursão.

-- SOLUÇÃO: Modificar a política RLS de family_members para não usar get_user_families
-- e usar uma abordagem mais simples e direta.

-- 1. Corrigir a política RLS de family_members
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

-- 2. Corrigir a função get_user_families para evitar recursão
DROP FUNCTION IF EXISTS public.get_user_families(p_user_id uuid);
CREATE OR REPLACE FUNCTION public.get_user_families(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_family_ids uuid[];
BEGIN
  SET search_path = public, pg_temp;
  
  -- Usar uma query direta sem RLS para evitar recursão
  -- Esta função é SECURITY DEFINER, então pode aceder diretamente
  SELECT array_agg(family_id) INTO v_family_ids
  FROM family_members
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_family_ids, ARRAY[]::uuid[]);
END;
$function$;

-- 3. Garantir que as outras políticas não causem problemas
-- Corrigir políticas de transactions que usam get_user_families
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

-- 4. Corrigir políticas de goals
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