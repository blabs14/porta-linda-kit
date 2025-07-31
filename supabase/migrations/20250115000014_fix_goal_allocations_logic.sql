-- Migração: Corrigir lógica de alocações de objetivos
-- Data: 2025-01-15

-- 1. Criar view para combinar saldo total, reservado e disponível
CREATE OR REPLACE VIEW account_balances_with_reserved AS
SELECT 
    a.id AS account_id,
    a.nome,
    a.user_id,
    COALESCE(a.saldo, 0) AS saldo_total,
    COALESCE(ar.total_reservado, 0) AS total_reservado,
    COALESCE(a.saldo, 0) - COALESCE(ar.total_reservado, 0) AS saldo_disponivel
FROM accounts a
LEFT JOIN account_reserved ar ON a.id = ar.account_id;

-- 2. Atualizar função RPC para usar a nova view
CREATE OR REPLACE FUNCTION public.get_user_accounts_with_balances(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(account_id uuid, nome text, user_id uuid, tipo text, saldo_atual numeric, total_reservado numeric, saldo_disponivel numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get accounts with balances for the specified user using the new view
    RETURN QUERY
    SELECT 
      abwr.account_id,
      abwr.nome,
      abwr.user_id,
      a.tipo,
      abwr.saldo_total as saldo_atual,
      abwr.total_reservado,
      abwr.saldo_disponivel
    FROM account_balances_with_reserved abwr
    JOIN accounts a ON a.id = abwr.account_id
    WHERE abwr.user_id = v_user_id
    ORDER BY abwr.nome;
  END;
END;
$function$;

-- 3. Remover transações de alocação antigas (já executado manualmente)
-- DELETE FROM transactions WHERE descricao LIKE '%Alocação%';

-- 4. Recalcular saldos das contas (já executado manualmente)
-- SELECT update_account_balance(id) FROM accounts;

-- Fim da migração 