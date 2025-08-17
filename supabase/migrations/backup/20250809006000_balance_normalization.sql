-- Normalização de saldos: converter accounts.saldo em transações de ajuste
-- Regras:
--  - Para cada conta com saldo != 0, criar 1 transação de "Ajuste Inicial (normalização de saldo)"
--    receita se saldo > 0, despesa se saldo < 0, com valor = |saldo|, datada de hoje.
--  - Zerar accounts.saldo (passa a 0), mantendo o histórico via transações.
--  - Atualizar agregados (se existir a RPC update_account_balance).

DO $$
DECLARE
  r RECORD;
  _cat uuid;
BEGIN
  FOR r IN (
    SELECT id, user_id, saldo
    FROM public.accounts
    WHERE COALESCE(saldo, 0) <> 0
  ) LOOP
    -- Garantir categoria "Ajuste" para o utilizador
    SELECT id INTO _cat
    FROM public.categories
    WHERE user_id = r.user_id AND nome = 'Ajuste'
    LIMIT 1;

    IF _cat IS NULL THEN
      INSERT INTO public.categories (nome, cor, user_id)
      VALUES ('Ajuste', '#6B7280', r.user_id)
      RETURNING id INTO _cat;
    END IF;

    -- Criar transação de ajuste inicial
    INSERT INTO public.transactions (
      account_id, user_id, categoria_id, valor, tipo, data, descricao
    ) VALUES (
      r.id,
      r.user_id,
      _cat,
      ABS(r.saldo),
      CASE WHEN r.saldo > 0 THEN 'receita' ELSE 'despesa' END,
      CURRENT_DATE,
      'Ajuste Inicial (normalização de saldo)'
    );

    -- Zerar coluna saldo
    UPDATE public.accounts
       SET saldo = 0
     WHERE id = r.id;

    -- Atualizar agregados, se existir a RPC
    BEGIN
      PERFORM public.update_account_balance(account_id_param := r.id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$; 