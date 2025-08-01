-- Migração: Criar tabelas de família
-- Data: 2025-01-15

-- Criar tabela families
CREATE TABLE IF NOT EXISTS public.families (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    settings jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela family_members
CREATE TABLE IF NOT EXISTS public.family_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    permissions text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(family_id, user_id)
);

-- Criar tabela family_invites
CREATE TABLE IF NOT EXISTS public.family_invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_email text NOT NULL,
    invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON public.family_members(role);
CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON public.family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_invited_email ON public.family_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_family_invites_status ON public.family_invites(status);
CREATE INDEX IF NOT EXISTS idx_family_invites_expires_at ON public.family_invites(expires_at);

-- Habilitar RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para families
CREATE POLICY families_select ON public.families
FOR SELECT TO authenticated USING (
    id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid()
    )
);

CREATE POLICY families_insert ON public.families
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY families_update ON public.families
FOR UPDATE TO authenticated USING (
    id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

CREATE POLICY families_delete ON public.families
FOR DELETE TO authenticated USING (
    id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

-- Políticas RLS para family_members
CREATE POLICY family_members_select ON public.family_members
FOR SELECT TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid()
    )
);

CREATE POLICY family_members_insert ON public.family_members
FOR INSERT TO authenticated WITH CHECK (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

CREATE POLICY family_members_update ON public.family_members
FOR UPDATE TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

CREATE POLICY family_members_delete ON public.family_members
FOR DELETE TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

-- Políticas RLS para family_invites
CREATE POLICY family_invites_select ON public.family_invites
FOR SELECT TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid()
    ) OR
    invited_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
    )
);

CREATE POLICY family_invites_insert ON public.family_invites
FOR INSERT TO authenticated WITH CHECK (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

CREATE POLICY family_invites_update ON public.family_invites
FOR UPDATE TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    ) OR
    invited_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
    )
);

CREATE POLICY family_invites_delete ON public.family_invites
FOR DELETE TO authenticated USING (
    family_id IN (
        SELECT fm.family_id
        FROM family_members fm
        WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_invites_updated_at BEFORE UPDATE ON public.family_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 