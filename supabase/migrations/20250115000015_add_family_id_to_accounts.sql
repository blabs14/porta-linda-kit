-- Migração: Adicionar family_id à tabela accounts
-- Data: 2025-01-15

-- Adicionar coluna family_id à tabela accounts
ALTER TABLE public.accounts 
ADD COLUMN family_id uuid REFERENCES public.families(id);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_accounts_family_id ON public.accounts(family_id);

-- Atualizar política RLS para accounts com family_id
DROP POLICY IF EXISTS accounts_select_family ON public.accounts;
CREATE POLICY accounts_select_family ON public.accounts
FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  family_id IN (
    SELECT fm.family_id
    FROM family_members fm
    WHERE fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS accounts_insert_family ON public.accounts;
CREATE POLICY accounts_insert_family ON public.accounts
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR
  family_id IN (
    SELECT fm.family_id
    FROM family_members fm
    WHERE fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS accounts_update_family ON public.accounts;
CREATE POLICY accounts_update_family ON public.accounts
FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR
  family_id IN (
    SELECT fm.family_id
    FROM family_members fm
    WHERE fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS accounts_delete_family ON public.accounts;
CREATE POLICY accounts_delete_family ON public.accounts
FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  family_id IN (
    SELECT fm.family_id
    FROM family_members fm
    WHERE fm.user_id = auth.uid()
  )
); 