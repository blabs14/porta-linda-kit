-- Migration: Account Reserve Management Consolidated
-- Consolidates 3 migrations: account_reserve_settings, update_account_reserved_view, update_account_reserved_view_fixed
-- Implements automatic percentage-based reserve calculations with corrected view

-- Create table for account reserve settings
CREATE TABLE IF NOT EXISTS public.account_reserve_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reserved_percent_bp INTEGER NOT NULL DEFAULT 0 CHECK (reserved_percent_bp >= 0 AND reserved_percent_bp <= 10000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one setting per account per user
    UNIQUE(account_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_account_reserve_settings_account_user 
ON public.account_reserve_settings(account_id, user_id);

-- Enable RLS
ALTER TABLE public.account_reserve_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reserve settings"
ON public.account_reserve_settings
FOR SELECT
USING (
    user_id = auth.uid()
    OR 
    -- Allow family members to see settings for shared accounts
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_reserve_settings.account_id 
        AND a.family_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_id = a.family_id 
            AND fm.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can manage their own reserve settings"
ON public.account_reserve_settings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_account_reserve_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_reserve_settings_updated_at
    BEFORE UPDATE ON public.account_reserve_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_account_reserve_settings_updated_at();

-- Function to get account reserve percentage
CREATE OR REPLACE FUNCTION get_account_reserve_percentage(
    p_account_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_percentage INTEGER;
BEGIN
    -- Use provided user_id or current user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get the percentage setting
    SELECT reserved_percent_bp INTO v_percentage
    FROM public.account_reserve_settings
    WHERE account_id = p_account_id AND user_id = v_user_id;
    
    -- Return 0 if no setting found
    RETURN COALESCE(v_percentage, 0);
END;
$$;

-- Function to set account reserve percentage
CREATE OR REPLACE FUNCTION set_account_reserve_percentage(
    p_account_id UUID,
    p_reserved_percent_bp INTEGER,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_account_exists BOOLEAN;
BEGIN
    -- Use provided user_id or current user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Validate percentage (0-100% = 0-10000 basis points)
    IF p_reserved_percent_bp < 0 OR p_reserved_percent_bp > 10000 THEN
        RAISE EXCEPTION 'Percentage must be between 0 and 10000 basis points (0-100%%)';
    END IF;
    
    -- Check if account exists and user has access
    SELECT EXISTS(
        SELECT 1 FROM public.accounts a
        WHERE a.id = p_account_id
        AND (
            a.user_id = v_user_id
            OR 
            (a.family_id IS NOT NULL AND EXISTS(
                SELECT 1 FROM public.family_members fm
                WHERE fm.family_id = a.family_id AND fm.user_id = v_user_id
            ))
        )
    ) INTO v_account_exists;
    
    IF NOT v_account_exists THEN
        RAISE EXCEPTION 'Account not found or access denied';
    END IF;
    
    -- Insert or update the setting
    INSERT INTO public.account_reserve_settings (account_id, user_id, reserved_percent_bp)
    VALUES (p_account_id, v_user_id, p_reserved_percent_bp)
    ON CONFLICT (account_id, user_id)
    DO UPDATE SET 
        reserved_percent_bp = EXCLUDED.reserved_percent_bp,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.account_reserved;

-- Create the corrected account_reserved view with automatic percentage calculation
CREATE VIEW public.account_reserved AS
WITH goal_allocations AS (
    SELECT 
        ga.account_id,
        COALESCE(SUM(ga.valor), 0) as total_alocado
    FROM public.goal_allocations ga
    INNER JOIN public.goals g ON ga.goal_id = g.id
    WHERE g.status != 'completed'
    GROUP BY ga.account_id
),
account_balances_calc AS (
    SELECT 
        a.id as account_id,
        a.user_id,
        COALESCE(SUM(
            CASE 
                WHEN t.tipo = 'receita' THEN t.valor
                WHEN t.tipo = 'despesa' THEN -t.valor
                ELSE 0
            END
        ), 0) as saldo_atual
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    GROUP BY a.id, a.user_id
),
automatic_reserves AS (
    SELECT 
        abc.account_id,
        abc.user_id,
        abc.saldo_atual,
        -- Calculate available balance (current balance minus existing allocations)
        abc.saldo_atual - COALESCE(ga.total_alocado, 0) as saldo_disponivel,
        -- Get automatic percentage setting for current user
        COALESCE(get_account_reserve_percentage(abc.account_id, abc.user_id), 0) as auto_percent_bp,
        -- Calculate automatic reserve amount based on available balance
        CASE 
            WHEN COALESCE(get_account_reserve_percentage(abc.account_id, abc.user_id), 0) > 0 
            THEN GREATEST(0, (abc.saldo_atual - COALESCE(ga.total_alocado, 0)) * COALESCE(get_account_reserve_percentage(abc.account_id, abc.user_id), 0) / 10000.0)
            ELSE 0
        END as auto_reserve_amount
    FROM account_balances_calc abc
    LEFT JOIN goal_allocations ga ON abc.account_id = ga.account_id
)
SELECT 
    ar.account_id,
    ar.user_id,
    -- Total reserved = existing goal allocations + automatic percentage reserve
    COALESCE(ga.total_alocado, 0) + ar.auto_reserve_amount as total_reservado,
    -- Breakdown for transparency
    COALESCE(ga.total_alocado, 0) as reservado_objetivos,
    ar.auto_reserve_amount as reservado_automatico,
    ar.auto_percent_bp as percentagem_automatica_bp,
    ar.saldo_disponivel,
    ar.saldo_atual
FROM automatic_reserves ar
LEFT JOIN goal_allocations ga ON ar.account_id = ga.account_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_reserve_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_reserve_percentage TO authenticated;
GRANT EXECUTE ON FUNCTION set_account_reserve_percentage TO authenticated;
GRANT SELECT ON public.account_reserved TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_reserved_account_id 
ON public.accounts(id);

-- Note: The existing get_user_accounts_with_balances and get_family_accounts_with_balances
-- RPCs will automatically pick up the new total_reservado calculation without changes
-- because they reference the account_reserved view