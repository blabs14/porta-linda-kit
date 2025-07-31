-- Migração: Criar função RPC para alocação de objetivos com transação
-- Data: 2025-01-15

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
      INSERT INTO categories (nome, user_id, cor, tipo)
      VALUES ('Objetivos', user_id_param, '#3B82F6', 'despesa')
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
    
    -- 3. Criar a transação de débito
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
      'despesa',
      NOW()::date,
      description_param,
      goal_id_param,
      user_id_param
    )
    RETURNING * INTO transaction_record;
    
    -- 4. Atualizar saldo da conta
    PERFORM update_account_balance(account_id_param);
    
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

-- Fim da migração 