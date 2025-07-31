-- Função para eliminar objetivo com lógica de restituição de valores
CREATE OR REPLACE FUNCTION public.delete_goal_with_restoration(goal_id_param uuid, user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  goal_record record;
  allocation_record record;
  total_allocated numeric := 0;
  goal_progress numeric := 0;
  account_id uuid;
  result json;
BEGIN
  -- 1. Buscar informações do objetivo
  SELECT * INTO goal_record 
  FROM goals 
  WHERE id = goal_id_param AND user_id = user_id_param;
  
  IF goal_record IS NULL THEN
    RAISE EXCEPTION 'Objetivo não encontrado';
  END IF;
  
  -- 2. Calcular progresso do objetivo
  SELECT COALESCE(SUM(valor), 0) INTO total_allocated
  FROM goal_allocations 
  WHERE goal_id = goal_id_param;
  
  IF goal_record.valor_objetivo > 0 THEN
    goal_progress := (total_allocated / goal_record.valor_objetivo) * 100;
  END IF;
  
  -- 3. Buscar a conta associada ao objetivo (primeira alocação)
  SELECT account_id INTO account_id
  FROM goal_allocations 
  WHERE goal_id = goal_id_param 
  LIMIT 1;
  
  -- 4. Se o objetivo não atingiu 100%, restituir valores
  IF goal_progress < 100 AND account_id IS NOT NULL THEN
    -- Criar transação de restituição (tipo 'transferencia' para não afetar saldo total)
    INSERT INTO transactions (
      account_id, 
      categoria_id, 
      valor, 
      tipo, 
      data, 
      descricao, 
      user_id
    )
    SELECT 
      ga.account_id,
      c.id as categoria_id,
      ga.valor,
      'transferencia',
      NOW()::date,
      'Restituição - Objetivo eliminado: ' || goal_record.nome,
      user_id_param
    FROM goal_allocations ga
    LEFT JOIN categories c ON c.nome = 'Objetivos' AND c.user_id = user_id_param
    WHERE ga.goal_id = goal_id_param;
    
    -- Atualizar saldo da conta (remover do reservado)
    UPDATE accounts 
    SET saldo = saldo - total_allocated
    WHERE id = account_id;
  END IF;
  
  -- 5. Eliminar todas as alocações do objetivo
  DELETE FROM goal_allocations WHERE goal_id = goal_id_param;
  
  -- 6. Eliminar o objetivo
  DELETE FROM goals WHERE id = goal_id_param AND user_id = user_id_param;
  
  -- 7. Retornar resultado
  result := json_build_object(
    'success', true,
    'goal_name', goal_record.nome,
    'total_allocated', total_allocated,
    'goal_progress', goal_progress,
    'restored_to_account', goal_progress < 100,
    'account_id', account_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN 
    RAISE EXCEPTION 'Erro ao eliminar objetivo: %', SQLERRM;
END;
$$; 