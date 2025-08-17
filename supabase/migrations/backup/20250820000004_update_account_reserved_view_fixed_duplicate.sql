-- Migration: Update account_reserved view to include automatic percentage
-- This updates the existing view to calculate automatic reserve based on available balance percentage

-- Drop the existing view
DROP VIEW IF EXISTS public.account_reserved;

-- Recreate the view with automatic percentage calculation
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
GRANT SELECT ON public.account_reserved TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_reserved_account_id 
ON public.accounts(id);

-- Update the existing RPC functions to work with the new view structure
-- These will continue to work as before, but now include automatic percentage

-- Note: The existing get_user_accounts_with_balances and get_family_accounts_with_balances
-- RPCs will automatically pick up the new total_reservado calculation without changes
-- because they reference the account_reserved view