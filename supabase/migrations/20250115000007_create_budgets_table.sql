-- Criar tabela budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
    mes VARCHAR(7) NOT NULL CHECK (mes ~ '^\d{4}-\d{2}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS budgets_categoria_id_idx ON public.budgets(categoria_id);
CREATE INDEX IF NOT EXISTS budgets_mes_idx ON public.budgets(mes);
CREATE INDEX IF NOT EXISTS budgets_user_mes_idx ON public.budgets(user_id, mes);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();

-- RLS Policies
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - utilizador pode ver apenas os seus orçamentos
CREATE POLICY budgets_select_own ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT - utilizador pode criar apenas os seus orçamentos
CREATE POLICY budgets_insert_own ON public.budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - utilizador pode atualizar apenas os seus orçamentos
CREATE POLICY budgets_update_own ON public.budgets
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para DELETE - utilizador pode remover apenas os seus orçamentos
CREATE POLICY budgets_delete_own ON public.budgets
    FOR DELETE USING (auth.uid() = user_id); 