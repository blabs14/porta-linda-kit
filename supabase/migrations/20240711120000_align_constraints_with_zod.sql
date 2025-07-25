-- Migração: Alinhar constraints SQL com validação Zod do frontend
-- Data: 2024-07-11

-- accounts: tipo NOT NULL e enum
ALTER TABLE public.accounts
  ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_tipo_check CHECK (tipo IN ('corrente', 'poupança', 'investimento', 'outro'));

-- categories: expandir enum tipo
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_tipo_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_tipo_check CHECK (tipo IN ('despesa', 'receita', 'poupança', 'investimento', 'outro'));

-- transactions: tornar account_id e categoria_id obrigatórios
ALTER TABLE public.transactions
  ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.transactions
  ALTER COLUMN categoria_id SET NOT NULL;
-- valor mínimo
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_valor_min CHECK (valor >= 0.01);
-- descrição limite de tamanho
ALTER TABLE public.transactions
  ALTER COLUMN descricao TYPE varchar(255);

-- goals: status enum, nome obrigatório, prazo obrigatório
ALTER TABLE public.goals
  ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.goals
  ALTER COLUMN prazo SET NOT NULL;
ALTER TABLE public.goals
  ALTER COLUMN status TYPE varchar(16);
ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE public.goals
  ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'cancelled'));

-- fixed_expenses: nome obrigatório, dia_vencimento já tem check, categoria_id obrigatória
ALTER TABLE public.fixed_expenses
  ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.fixed_expenses
  ALTER COLUMN categoria_id SET NOT NULL;

-- family_members: role enum
ALTER TABLE public.family_members
  DROP CONSTRAINT IF EXISTS family_members_role_check;
ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- family_invites: role e status enums
ALTER TABLE public.family_invites
  DROP CONSTRAINT IF EXISTS family_invites_role_check;
ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
ALTER TABLE public.family_invites
  DROP CONSTRAINT IF EXISTS family_invites_status_check;
ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_status_check CHECK (status IN ('pending', 'accepted', 'declined'));

-- settings: moeda, idioma, tema enums (se existir tabela)
-- NOTA: Se settings for JSONB, não aplicar aqui.

-- notification, webhook, reminder, attachment: se existirem tabelas, sugerir constraints semelhantes.

-- Fim da migração 