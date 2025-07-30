-- Função para criar transferências e atualizar saldos automaticamente
CREATE OR REPLACE FUNCTION create_transfer_transaction(
  p_from_account_id TEXT,
  p_to_account_id TEXT,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_categoria_id TEXT DEFAULT NULL,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_transaction_id TEXT;
  v_result JSON;
BEGIN
  -- Validar parâmetros
  IF p_from_account_id IS NULL OR p_to_account_id IS NULL OR p_amount IS NULL THEN
    RETURN json_build_object('error', 'Parâmetros obrigatórios em falta');
  END IF;
  
  IF p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('error', 'Conta de origem e destino devem ser diferentes');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN json_build_object('error', 'Valor deve ser maior que zero');
  END IF;
  
  -- Verificar se as contas existem e pertencem ao utilizador
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id) THEN
    RETURN json_build_object('error', 'Conta de origem não encontrada ou não pertence ao utilizador');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id) THEN
    RETURN json_build_object('error', 'Conta de destino não encontrada ou não pertence ao utilizador');
  END IF;
  
  -- Verificar saldo disponível na conta de origem
  IF EXISTS (
    SELECT 1 FROM account_balances 
    WHERE account_id = p_from_account_id 
    AND saldo_atual < p_amount
  ) THEN
    RETURN json_build_object('error', 'Saldo insuficiente na conta de origem');
  END IF;
  
  -- Inserir a transação de transferência
  INSERT INTO transactions (
    account_id,
    categoria_id,
    tipo,
    valor,
    descricao,
    data,
    user_id,
    is_transfer,
    transfer_destination_account_id,
    transfer_amount
  ) VALUES (
    p_from_account_id,
    COALESCE(p_categoria_id, (SELECT id FROM categories WHERE nome = 'Transferências' AND user_id = p_user_id LIMIT 1)),
    'transferencia',
    p_amount,
    COALESCE(p_description, 'Transferência entre contas'),
    p_data,
    p_user_id,
    TRUE,
    p_to_account_id,
    p_amount
  ) RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo da conta de origem (deduzir)
  UPDATE accounts 
  SET saldo = COALESCE(saldo, 0) - p_amount
  WHERE id = p_from_account_id;
  
  -- Atualizar saldo da conta de destino (adicionar)
  UPDATE accounts 
  SET saldo = COALESCE(saldo, 0) + p_amount
  WHERE id = p_to_account_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'from_account_id', p_from_account_id,
    'to_account_id', p_to_account_id,
    'amount', p_amount,
    'message', 'Transferência realizada com sucesso'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Erro ao realizar transferência: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION create_transfer_transaction IS 
'Função para criar transferências entre contas e atualizar saldos automaticamente'; 