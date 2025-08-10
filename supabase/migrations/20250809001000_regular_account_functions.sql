-- Regular account functions

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
BEGIN
  -- Garantir que o utilizador autenticado coincide com o p_user_id
  SELECT auth.uid() INTO _uid;
  IF _uid IS NULL OR _uid <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Atualizar diretamente o saldo da conta (contas não-cartão)
  UPDATE public.accounts
     SET saldo = COALESCE(p_new_balance, 0)
   WHERE id = p_account_id
     AND user_id = p_user_id;

  -- Atualizar agregados se a RPC existir
  BEGIN
    PERFORM public.update_account_balance(account_id_param := p_account_id);
  EXCEPTION WHEN undefined_function THEN
    -- Ignorar se não existir no ambiente local
    NULL;
  END;

  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) TO authenticated, service_role; 