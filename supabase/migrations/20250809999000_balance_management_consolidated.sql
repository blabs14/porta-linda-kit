-- MIGRAÇÃO CONSOLIDADA: Gestão de Saldos de Contas
-- Substitui as migrações: 20250809003000, 20250809004000, 20250809005000, 20250809006000, 20250809007000
-- 
-- Funcionalidades:
-- 1. Normalização de saldos existentes (converter accounts.saldo em transações)
-- 2. Função robusta set_regular_account_balance (cálculo baseado exclusivamente em transações)
-- 3. Gestão de categoria "Ajuste" automática
-- 4. Autorização e segurança adequadas

-- FASE 1: Normalização de saldos existentes
-- Converter accounts.saldo em transações de ajuste e zerar a coluna
DO $$
DECLARE
  r RECORD;
  _cat uuid;
BEGIN
  RAISE NOTICE 'Iniciando normalização de saldos...';
  
  FOR r IN (
    SELECT id, user_id, saldo, nome
    FROM public.accounts
    WHERE COALESCE(saldo, 0) <> 0
  ) LOOP
    RAISE NOTICE 'Processando conta: % (saldo: %)', r.nome, r.saldo;
    
    -- Garantir categoria "Ajuste" para o utilizador
    SELECT id INTO _cat
    FROM public.categories
    WHERE user_id = r.user_id AND nome = 'Ajuste'
    LIMIT 1;

    IF _cat IS NULL THEN
      INSERT INTO public.categories (nome, cor, user_id)
      VALUES ('Ajuste', '#6B7280', r.user_id)
      RETURNING id INTO _cat;
      RAISE NOTICE 'Categoria "Ajuste" criada para utilizador %', r.user_id;
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
  
  RAISE NOTICE 'Normalização de saldos concluída.';
END $$;

-- FASE 2: Função consolidada set_regular_account_balance
-- Remove versões anteriores e cria versão final
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_regular_account_balance'
  ) THEN
    DROP FUNCTION IF EXISTS public.set_regular_account_balance(uuid, uuid, numeric);
    RAISE NOTICE 'Função set_regular_account_balance anterior removida.';
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
  _current numeric := 0;
  _diff numeric := 0;
  _cat uuid;
  _account_exists boolean := false;
BEGIN
  -- Autorização robusta
  SELECT auth.uid() INTO _uid;
  IF _uid IS NULL OR _uid <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized: user % cannot modify account %', _uid, p_account_id;
  END IF;

  -- Verificar se a conta existe e pertence ao utilizador
  SELECT EXISTS(
    SELECT 1 FROM public.accounts 
    WHERE id = p_account_id AND user_id = p_user_id
  ) INTO _account_exists;
  
  IF NOT _account_exists THEN
    RAISE EXCEPTION 'Account % not found or not owned by user %', p_account_id, p_user_id;
  END IF;

  -- Calcular saldo atual exclusivamente por transações (receita - despesa)
  -- Exclui transferências conforme lógica mais recente
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN t.tipo = 'receita' THEN t.valor 
        WHEN t.tipo = 'despesa' THEN -t.valor 
        ELSE 0 
      END
    ), 0
  ) INTO _current
  FROM public.transactions t
  WHERE t.account_id = p_account_id
    AND t.user_id = p_user_id
    AND t.tipo != 'transferencia'; -- Exclui transferências do cálculo

  _diff := COALESCE(p_new_balance, 0) - COALESCE(_current, 0);

  -- Se há diferença, criar transação de ajuste
  IF _diff <> 0 THEN
    -- Garantir categoria "Ajuste" existe
    SELECT id INTO _cat 
    FROM public.categories 
    WHERE user_id = p_user_id AND nome = 'Ajuste' 
    LIMIT 1;
    
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
    
    RAISE NOTICE 'Transação de ajuste criada: % (valor: %)', 
      CASE WHEN _diff > 0 THEN 'receita' ELSE 'despesa' END, ABS(_diff);
  END IF;

  -- Atualizar agregados, se existir a função
  BEGIN
    PERFORM public.update_account_balance(account_id_param := p_account_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN true;
END; $$;

-- FASE 3: Configuração de permissões
REVOKE ALL ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) TO authenticated, service_role;

-- FASE 4: Comentários e documentação
COMMENT ON FUNCTION public.set_regular_account_balance(uuid, uuid, numeric) IS 
'Função consolidada para definir saldo de contas regulares.
Calcula saldo atual exclusivamente por transações (exclui transferências).
Cria transação de ajuste para atingir o novo saldo.
Gere automaticamente a categoria "Ajuste" se necessário.
Inclui autorização robusta e validação de propriedade da conta.';

-- Log de conclusão
DO $$ BEGIN
  RAISE NOTICE 'MIGRAÇÃO CONSOLIDADA DE SALDOS CONCLUÍDA';
  RAISE NOTICE 'Funcionalidades implementadas:';
  RAISE NOTICE '✓ Normalização de saldos existentes';
  RAISE NOTICE '✓ Função set_regular_account_balance consolidada';
  RAISE NOTICE '✓ Gestão automática de categoria "Ajuste"';
  RAISE NOTICE '✓ Autorização e validação robustas';
  RAISE NOTICE '✓ Exclusão de transferências do cálculo de saldo';
END $$;