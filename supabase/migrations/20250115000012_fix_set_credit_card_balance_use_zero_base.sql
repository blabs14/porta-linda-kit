-- Fix set_credit_card_balance to use zero as base when there are adjustment transactions
-- This ensures that when setting a new balance, we start from a clean slate

CREATE OR REPLACE FUNCTION public.set_credit_card_balance(p_user_id uuid, p_account_id uuid, p_new_balance numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_category_id UUID;
  v_current_total_expenses NUMERIC := 0;
  v_current_total_payments NUMERIC := 0;
  v_new_total_expenses NUMERIC := 0;
  v_new_total_payments NUMERIC := 0;
  v_adjustment_amount NUMERIC := 0;
  v_has_adjustment_transactions BOOLEAN := FALSE;
BEGIN
  -- Verificar se a conta existe e é um cartão de crédito
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;

  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;

  -- Ensure new balance is always 0 or negative for credit cards
  p_new_balance := LEAST(0, p_new_balance);

  -- Check if there are any adjustment transactions
  SELECT EXISTS(
    SELECT 1 FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%'
  ) INTO v_has_adjustment_transactions;

  -- If there are adjustment transactions, we need to clear them and start fresh
  IF v_has_adjustment_transactions THEN
    -- Delete all adjustment transactions
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';
    
    -- Reset totals to zero since we're starting fresh
    v_current_total_expenses := 0;
    v_current_total_payments := 0;
  ELSE
    -- Get current totals from real transactions only (excluding any existing adjustments)
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0)
    INTO v_current_total_expenses, v_current_total_payments
    FROM transactions
    WHERE account_id = p_account_id;
  END IF;

  -- Buscar ou criar categoria "Ajuste"
  SELECT id INTO v_category_id FROM categories
  WHERE nome = 'Ajuste' AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO categories (nome, user_id, cor)
    VALUES ('Ajuste', p_user_id, '#6B7280')
    RETURNING id INTO v_category_id;
  END IF;

  -- Logic based on new balance
  IF p_new_balance = 0 THEN
    -- If new balance is 0, zero out both totals
    v_new_total_expenses := 0;
    v_new_total_payments := 0;
  ELSE
    -- If new balance is not 0, adjust totals to match the new balance
    -- The goal is: v_new_total_payments - v_new_total_expenses = p_new_balance
    -- Since p_new_balance is negative, we need: v_new_total_expenses - v_new_total_payments = ABS(p_new_balance)
    
    IF p_new_balance < 0 THEN
      -- Need to increase expenses to create the debt
      v_new_total_expenses := v_current_total_expenses + ABS(p_new_balance);
      v_new_total_payments := v_current_total_payments;
    ELSE
      -- This shouldn't happen due to LEAST(0, p_new_balance), but just in case
      v_new_total_expenses := v_current_total_expenses;
      v_new_total_payments := v_current_total_payments + p_new_balance;
    END IF;
  END IF;

  -- Create adjustment transactions to reach new totals
  -- Adjust expenses
  IF v_new_total_expenses != v_current_total_expenses THEN
    v_adjustment_amount := v_new_total_expenses - v_current_total_expenses;
    INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
    VALUES (
      p_user_id,
      p_account_id,
      v_category_id,
      ABS(v_adjustment_amount),
      CASE WHEN v_adjustment_amount > 0 THEN 'despesa' ELSE 'receita' END,
      CURRENT_DATE,
      'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar gastos para ' ELSE 'Reduzir gastos para ' END || v_new_total_expenses || '€'
    );
  END IF;

  -- Adjust payments
  IF v_new_total_payments != v_current_total_payments THEN
    v_adjustment_amount := v_new_total_payments - v_current_total_payments;
    INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
    VALUES (
      p_user_id,
      p_account_id,
      v_category_id,
      ABS(v_adjustment_amount),
      CASE WHEN v_adjustment_amount > 0 THEN 'receita' ELSE 'despesa' END,
      CURRENT_DATE,
      'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar pagamentos para ' ELSE 'Reduzir pagamentos para ' END || v_new_total_payments || '€'
    );
  END IF;

  -- Update account saldo
  UPDATE accounts
  SET saldo = p_new_balance
  WHERE id = p_account_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Saldo do cartão de crédito atualizado com sucesso',
    'previous_balance', v_account.saldo,
    'new_balance', p_new_balance,
    'previous_total_expenses', v_current_total_expenses,
    'new_total_expenses', v_new_total_expenses,
    'previous_total_payments', v_current_total_payments,
    'new_total_payments', v_new_total_payments,
    'had_adjustment_transactions', v_has_adjustment_transactions
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao atualizar saldo: ' || SQLERRM
    );
END;
$function$; 