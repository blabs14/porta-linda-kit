-- Migração: Criar tabela goal_allocations
-- Data: 2025-01-15

-- Criar tabela goal_allocations
CREATE TABLE IF NOT EXISTS public.goal_allocations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id uuid NOT NULL,
    account_id uuid NOT NULL,
    valor numeric NOT NULL CHECK (valor > 0),
    data_alocacao date DEFAULT CURRENT_DATE,
    descricao text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL
);

-- Adicionar foreign keys
ALTER TABLE public.goal_allocations 
    ADD CONSTRAINT goal_allocations_goal_id_fkey 
    FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;

ALTER TABLE public.goal_allocations 
    ADD CONSTRAINT goal_allocations_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.goal_allocations 
    ADD CONSTRAINT goal_allocations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Adicionar coluna goal_id à tabela transactions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'goal_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN goal_id uuid;
        ALTER TABLE public.transactions 
            ADD CONSTRAINT transactions_goal_id_fkey 
            FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_goal_allocations_goal_id ON public.goal_allocations(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_allocations_account_id ON public.goal_allocations(account_id);
CREATE INDEX IF NOT EXISTS idx_goal_allocations_user_id ON public.goal_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_allocations_data_alocacao ON public.goal_allocations(data_alocacao);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_goal_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_goal_allocations_updated_at_trigger ON public.goal_allocations;
CREATE TRIGGER update_goal_allocations_updated_at_trigger
    BEFORE UPDATE ON public.goal_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_allocations_updated_at();

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.goal_allocations ENABLE ROW LEVEL SECURITY;

-- Política para utilizadores verem apenas as suas alocações
CREATE POLICY "Users can view their own goal allocations" ON public.goal_allocations
    FOR SELECT USING (auth.uid() = user_id);

-- Política para utilizadores criarem alocações
CREATE POLICY "Users can create their own goal allocations" ON public.goal_allocations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para utilizadores atualizarem as suas alocações
CREATE POLICY "Users can update their own goal allocations" ON public.goal_allocations
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para utilizadores eliminarem as suas alocações
CREATE POLICY "Users can delete their own goal allocations" ON public.goal_allocations
    FOR DELETE USING (auth.uid() = user_id); 