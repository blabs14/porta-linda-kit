-- Migração para criar tabelas base que existem no Supabase remoto
-- mas não estão definidas nas migrações locais

-- 1. Tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    nome text NOT NULL,
    foto_url text,
    percentual_divisao numeric DEFAULT 50.00,
    poupanca_mensal numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Tabela categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['despesa', 'receita', 'poupança', 'investimento', 'outro'])),
    cor text DEFAULT '#3B82F6',
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    family_id uuid
);

-- 3. Tabela transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    valor numeric NOT NULL CHECK (valor >= 0.01),
    data date NOT NULL,
    categoria_id uuid NOT NULL,
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['receita', 'despesa'])),
    descricao character varying,
    created_at timestamp with time zone DEFAULT now(),
    family_id uuid,
    account_id uuid NOT NULL
);

-- 4. Tabela goals
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    valor_atual numeric DEFAULT 0,
    prazo date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    family_id uuid,
    valor_objetivo numeric DEFAULT 0 NOT NULL,
    ativa boolean DEFAULT true,
    status character varying DEFAULT 'active' CHECK (status::text = ANY (ARRAY['active', 'completed', 'cancelled'])),
    valor_meta numeric,
    account_id uuid
);

-- 5. Tabela fixed_expenses
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    valor numeric NOT NULL,
    dia_vencimento integer NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    categoria_id uuid NOT NULL,
    ativa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Tabela families
CREATE TABLE IF NOT EXISTS public.families (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome character varying NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    settings jsonb DEFAULT '{"allow_view_all": true, "require_approval": false, "allow_add_transactions": true}'::jsonb
);

-- 7. Tabela family_members
CREATE TABLE IF NOT EXISTS public.family_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    family_id uuid NOT NULL,
    role character varying DEFAULT 'member' CHECK (role::text = ANY (ARRAY['owner', 'admin', 'member', 'viewer'])),
    permissions text[] DEFAULT ARRAY['view'],
    joined_at timestamp with time zone DEFAULT now()
);

-- 8. Tabela family_invites
CREATE TABLE IF NOT EXISTS public.family_invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id uuid NOT NULL,
    email character varying NOT NULL,
    role character varying DEFAULT 'member' CHECK (role::text = ANY (ARRAY['owner', 'admin', 'member', 'viewer'])),
    status character varying DEFAULT 'pending' CHECK (status::text = ANY (ARRAY['pending', 'accepted', 'declined'])),
    invited_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    token character varying UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    accepted_at timestamp with time zone
);

-- 9. Tabela accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['corrente', 'poupança', 'investimento', 'outro'])),
    created_at timestamp with time zone DEFAULT now()
);

-- 10. Tabela debug_logs
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    operation text NOT NULL,
    table_name text NOT NULL,
    user_id uuid,
    result boolean NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. Tabela audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    operation text NOT NULL,
    table_name text NOT NULL,
    row_id uuid,
    old_data jsonb,
    new_data jsonb,
    details jsonb,
    ip_address text
);

-- Adicionar foreign keys
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.categories ADD CONSTRAINT categories_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categories(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);
ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.goals ADD CONSTRAINT goals_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
ALTER TABLE public.goals ADD CONSTRAINT goals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);
ALTER TABLE public.fixed_expenses ADD CONSTRAINT fixed_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.fixed_expenses ADD CONSTRAINT fixed_expenses_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categories(id);
ALTER TABLE public.families ADD CONSTRAINT families_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
ALTER TABLE public.family_invites ADD CONSTRAINT family_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);
ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY; 