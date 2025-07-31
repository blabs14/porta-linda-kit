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

-- 3. Atualizar função de alocação para criar transações como transferência
CREATE OR REPLACE FUNCTION public.allocate_to_goal_with_transaction(
  goal_id_param uuid,
  account_id_param uuid,
  amount_param numeric,
  user_id_param uuid,
  description_param text DEFAULT 'Alocação para objetivo'
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  categoria_id uuid;
  allocation_record record;
  transaction_record record;
BEGIN
  -- Iniciar transação
  BEGIN
    -- 1. Buscar ou criar a categoria "Objetivos"
    SELECT id INTO categoria_id
    FROM categories
    WHERE user_id = user_id_param AND nome = 'Objetivos';
    
    IF categoria_id IS NULL THEN
      INSERT INTO categories (nome, user_id, cor)
      VALUES ('Objetivos', user_id_param, '#3B82F6')
      RETURNING id INTO categoria_id;
    END IF;
    
    -- 2. Criar a alocação
    INSERT INTO goal_allocations (
      goal_id,
      account_id,
      valor,
      descricao,
      user_id,
      data_alocacao
    )
    VALUES (
      goal_id_param,
      account_id_param,
      amount_param,
      description_param,
      user_id_param,
      NOW()
    )
    RETURNING * INTO allocation_record;
    
    -- 3. Criar a transação como transferência (não afeta o saldo)
    INSERT INTO transactions (
      account_id,
      categoria_id,
      valor,
      tipo,
      data,
      descricao,
      goal_id,
      user_id
    )
    VALUES (
      account_id_param,
      categoria_id,
      amount_param,
      'transferencia',
      NOW()::date,
      description_param,
      goal_id_param,
      user_id_param
    )
    RETURNING * INTO transaction_record;
    
    -- 4. NÃO atualizar saldo da conta (transferências não afetam o saldo)
    -- PERFORM update_account_balance(account_id_param);
    
    -- Retornar resultado
    RETURN json_build_object(
      'allocation', row_to_json(allocation_record),
      'transaction', row_to_json(transaction_record),
      'success', true
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RAISE EXCEPTION 'Erro na alocação: %', SQLERRM;
  END;
END;
$$;

-- 4. Corrigir transações antigas de alocação para transferência
UPDATE transactions 
SET tipo = 'transferencia' 
WHERE descricao LIKE '%alocação%' OR descricao LIKE '%Alocação%' 
AND tipo = 'despesa';

-- 5. Remover transações de alocação antigas (já executado manualmente)
-- DELETE FROM transactions WHERE descricao LIKE '%Alocação%';

-- 6. Recalcular saldos das contas (já executado manualmente)
-- SELECT update_account_balance(id) FROM accounts;

-- Fim da migração 