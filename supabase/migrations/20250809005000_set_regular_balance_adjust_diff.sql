-- Define saldo de conta regular via transação de ajuste (saldo atual = accounts.saldo + Σ transações)

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_regular_account_balance'
  ) THEN
    DROP FUNCTION IF EXISTS public.set_regular_account_balance(uuid, uuid, numeric);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_regular_account_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_new_balance numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid uuid;
  _base numeric := 0;
  _txsum numeric := 0;
  _current numeric := 0;
  _diff numeric := 0;
  _cat uuid;
BEGIN
  -- Autorização
  SELECT auth.uid() INTO _uid;
  IF _uid IS NULL OR _uid <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Tentar via view (se existir)
  BEGIN
    SELECT COALESCE(saldo_atual, 0) INTO _current
    FROM public.account_balances
    WHERE account_id = p_account_id;
  EXCEPTION WHEN undefined_table THEN
    -- Fallback: saldo atual = accounts.saldo + Σ(receita - despesa)
    SELECT COALESCE(saldo, 0) INTO _base FROM public.accounts WHERE id = p_account_id AND user_id = p_user_id;
    SELECT COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor WHEN t.tipo = 'despesa' THEN -t.valor ELSE 0 END), 0)
      INTO _txsum
      FROM public.transactions t
     WHERE t.account_id = p_account_id
       AND t.user_id = p_user_id;
    _current := COALESCE(_base, 0) + COALESCE(_txsum, 0);
  END;

  _diff := COALESCE(p_new_balance, 0) - COALESCE(_current, 0);

  IF _diff <> 0 THEN
    -- Garantir categoria Ajuste
    SELECT id INTO _cat FROM public.categories WHERE user_id = p_user_id AND nome = 'Ajuste' LIMIT 1;
    IF _cat IS NULL THEN
      INSERT INTO public.categories (nome, cor, user_id)
      VALUES ('Ajuste', '#6B7280', p_user_id)
      RETURNING id INTO _cat;
    END IF;

    -- Criar transação de ajuste para atingir o novo saldo
    INSERT INTO public.transactions (
      account_id, user_id, categoria_id, valor, tipo, data, descricao
    ) VALUES (
      p_account_id,
      p_user_id,
      _cat,
      ABS(_diff),
      CASE WHEN _diff > 0 THEN 'receita' ELSE 'despesa' END,
      CURRENT_DATE,
      'Ajuste de saldo (definir saldo atual)'
    );
  END IF;

  -- Atualizar agregados, se existir
  BEGIN
    PERFORM public.update_account_balance(account_id_param := p_account_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) TO authenticated, service_role; 