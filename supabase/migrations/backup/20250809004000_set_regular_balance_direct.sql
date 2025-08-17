-- Redefine set_regular_account_balance para atualizar diretamente o saldo da conta (contas não-cartão)

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
  -- Autorização robusta
  SELECT auth.uid() INTO _uid;
  IF _uid IS NULL OR _uid <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Atualizar diretamente o saldo da conta
  UPDATE public.accounts
     SET saldo = COALESCE(p_new_balance, 0)
   WHERE id = p_account_id
     AND user_id = p_user_id;

  -- Atualizar agregados se existir a função
  BEGIN
    PERFORM public.update_account_balance(account_id_param := p_account_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) TO authenticated, service_role; 