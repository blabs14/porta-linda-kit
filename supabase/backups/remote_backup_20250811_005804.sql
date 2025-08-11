

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_family_invite"("invite_token" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    invite_record family_invites;
    new_member_id UUID;
BEGIN
    SET search_path = public, pg_temp;
    SELECT * INTO invite_record
    FROM family_invites
    WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Convite inválido ou expirado');
    END IF;
    IF EXISTS (
        SELECT 1 FROM family_members 
        WHERE family_id = invite_record.family_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Já é membro desta família');
    END IF;
    INSERT INTO family_members (user_id, family_id, role)
    VALUES (auth.uid(), invite_record.family_id, invite_record.role)
    RETURNING id INTO new_member_id;
    UPDATE family_invites
    SET status = 'accepted'
    WHERE id = invite_record.id;
    RETURN JSON_BUILD_OBJECT(
        'success', true, 
        'message', 'Convite aceito com sucesso',
        'family_id', invite_record.family_id,
        'member_id', new_member_id
    );
END;
$$;


ALTER FUNCTION "public"."accept_family_invite"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_family_invite_by_email"("p_invite_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_email text;
  v_invite record;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter email do utilizador
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Obter o convite
  SELECT * INTO v_invite
  FROM family_invites
  WHERE id = p_invite_id AND email = v_user_email AND status = 'pending';

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado ou já não é válido';
  END IF;

  -- Verificar se o convite não expirou
  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  -- Verificar se o utilizador já não é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = v_invite.family_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Já é membro desta família';
  END IF;

  -- Inserir o utilizador como membro da família
  INSERT INTO family_members (user_id, family_id, role)
  VALUES (v_user_id, v_invite.family_id, v_invite.role);

  -- Atualizar o status do convite
  UPDATE family_invites 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invite_id;

  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em accept_family_invite_by_email: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao aceitar convite';
END;
$$;


ALTER FUNCTION "public"."accept_family_invite_by_email"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."allocate_to_goal_with_transaction"("goal_id_param" "uuid", "account_id_param" "uuid", "amount_param" numeric, "user_id_param" "uuid", "description_param" "text" DEFAULT 'Alocação para objetivo'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  categoria_id uuid;
  objetivos_account_id uuid;
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
    
    -- 2. Buscar a conta "Objetivos"
    SELECT id INTO objetivos_account_id
    FROM accounts
    WHERE user_id = user_id_param AND nome = 'Objetivos';
    
    IF objetivos_account_id IS NULL THEN
      RAISE EXCEPTION 'Conta "Objetivos" não encontrada';
    END IF;
    
    -- 3. Criar a alocação apenas na conta origem
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
    
    -- 4. Criar a transação como transferência (não afeta o saldo total)
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
    
    -- 5. Adicionar valor ao saldo total da conta "Objetivos"
    UPDATE accounts 
    SET saldo = saldo + amount_param
    WHERE id = objetivos_account_id;
    
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


ALTER FUNCTION "public"."allocate_to_goal_with_transaction"("goal_id_param" "uuid", "account_id_param" "uuid", "amount_param" numeric, "user_id_param" "uuid", "description_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_family_invite"("p_invite_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT fm.role INTO v_user_role
  FROM family_members fm
  JOIN family_invites fi ON fm.family_id = fi.family_id
  WHERE fi.id = p_invite_id AND fm.user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não tem permissão para cancelar este convite';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cancelar convites';
  END IF;

  -- Cancelar o convite
  UPDATE family_invites 
  SET status = 'cancelled'
  WHERE id = p_invite_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou já não está pendente';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Convite cancelado com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em cancel_family_invite: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao cancelar convite';
END;
$$;


ALTER FUNCTION "public"."cancel_family_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_credit_card_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_account RECORD;
  v_total_expenses NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_category_id UUID;
BEGIN
  -- Verificar se é uma transação de cartão de crédito
  SELECT * INTO v_account
  FROM accounts 
  WHERE id = NEW.account_id;
  
  IF v_account.tipo = 'cartão de crédito' THEN
    -- Calcular totais atuais (excluindo ajustes de saldo)
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0)
    INTO v_total_expenses, v_total_payments
    FROM transactions 
    WHERE account_id = NEW.account_id;
    
    -- Calcular saldo
    v_balance := v_total_payments - v_total_expenses;
    
    -- Se o saldo é 0 (em dia), zerar totais e saldo
    IF v_balance = 0 AND (v_total_expenses > 0 OR v_total_payments > 0) THEN
      -- Buscar categoria "Ajuste"
      SELECT id INTO v_category_id FROM categories 
      WHERE nome = 'Ajuste' AND user_id = NEW.user_id 
      LIMIT 1;
      
      IF NOT FOUND THEN
        INSERT INTO categories (nome, user_id, cor)
        VALUES ('Ajuste', NEW.user_id, '#6B7280')
        RETURNING id INTO v_category_id;
      END IF;
      
      -- Criar transação de ajuste para zerar gastos
      IF v_total_expenses > 0 THEN
        INSERT INTO transactions (
          user_id,
          account_id,
          categoria_id,
          valor,
          tipo,
          data,
          descricao
        ) VALUES (
          NEW.user_id,
          NEW.account_id,
          v_category_id,
          v_total_expenses,
          'receita', -- Receita para compensar gastos
          CURRENT_DATE,
          'Ajuste de saldo: Zerar gastos (cartão em dia)'
        );
      END IF;
      
      -- Criar transação de ajuste para zerar pagamentos
      IF v_total_payments > 0 THEN
        INSERT INTO transactions (
          user_id,
          account_id,
          categoria_id,
          valor,
          tipo,
          data,
          descricao
        ) VALUES (
          NEW.user_id,
          NEW.account_id,
          v_category_id,
          v_total_payments,
          'despesa', -- Despesa para compensar pagamentos
          CURRENT_DATE,
          'Ajuste de saldo: Zerar pagamentos (cartão em dia)'
        );
      END IF;
      
      -- Atualizar saldo da conta para 0
      UPDATE accounts 
      SET saldo = 0 
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_credit_card_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_all_old_transfer_transactions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_transfer RECORD;
BEGIN
  -- Eliminar todas as transações antigas de transferência (despesa e receita)
  DELETE FROM transactions 
  WHERE descricao LIKE '%Transferência%' 
  AND tipo IN ('despesa', 'receita');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  v_result := jsonb_build_object(
    'success', true,
    'transactions_deleted', v_deleted_count,
    'message', 'Todas as transações antigas de transferência foram eliminadas'
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."cleanup_all_old_transfer_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_backups"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Eliminar backups expirados
  DELETE FROM family_backups 
  WHERE expires_at < now() 
    AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_backups"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_backups"() IS 'Limpa backups expirados automaticamente';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_transfer_transactions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_pairs_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_pair RECORD;
BEGIN
  -- Encontrar pares de transações de transferência (despesa + receita com mesma descrição e valor)
  FOR v_pair IN 
    SELECT 
      t1.id as expense_id,
      t2.id as income_id,
      t1.user_id,
      t1.valor,
      t1.data,
      t1.categoria_id,
      t1.descricao,
      t1.account_id as from_account_id,
      t2.account_id as to_account_id,
      t1.created_at
    FROM transactions t1
    INNER JOIN transactions t2 ON 
      t1.user_id = t2.user_id 
      AND t1.valor = t2.valor 
      AND t1.data = t2.data
      AND t1.descricao = t2.descricao
      AND t1.descricao LIKE '%Transferência%'
      AND t1.tipo = 'despesa'
      AND t2.tipo = 'receita'
      AND t1.id < t2.id -- Evitar duplicatas
  LOOP
    v_pairs_count := v_pairs_count + 1;
    
    -- Criar uma nova transação de transferência
    INSERT INTO transactions (
      user_id,
      valor,
      data,
      categoria_id,
      tipo,
      descricao,
      account_id
    ) VALUES (
      v_pair.user_id,
      v_pair.valor,
      v_pair.data,
      v_pair.categoria_id,
      'transferencia',
      v_pair.descricao,
      v_pair.from_account_id
    );
    
    v_created_count := v_created_count + 1;
    
    -- Eliminar as transações antigas (despesa e receita)
    DELETE FROM transactions WHERE id = v_pair.expense_id;
    DELETE FROM transactions WHERE id = v_pair.income_id;
    
    v_deleted_count := v_deleted_count + 2;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'pairs_found', v_pairs_count,
    'transactions_created', v_created_count,
    'transactions_deleted', v_deleted_count,
    'message', 'Limpeza de transações duplas concluída'
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_transfer_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_unused_indexes"() RETURNS TABLE("index_name" "text", "table_name" "text", "index_size" "text", "last_scan_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname::text,
        t.relname::text,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::text,
        EXTRACT(DAYS FROM NOW() - s.last_idx_scan)::integer
    FROM pg_indexes i
    JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
    JOIN pg_stat_user_tables t ON s.relname = t.relname
    WHERE i.schemaname = 'public'
      AND s.idx_scan = 0
      AND s.last_idx_scan < NOW() - INTERVAL '30 days'
    ORDER BY pg_relation_size(i.indexname::regclass) DESC;
END;
$$;


ALTER FUNCTION "public"."cleanup_unused_indexes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text" DEFAULT 'full'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_family_record RECORD;
  v_backup_id UUID;
  v_backup_data JSONB;
  v_file_path TEXT;
  v_file_size BIGINT;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se a família existe e se o utilizador tem permissão
  SELECT f.* INTO v_family_record
  FROM families f
  JOIN family_members fm ON fm.family_id = f.id
  WHERE f.id = p_family_id 
    AND fm.user_id = v_user_id
    AND fm.role IN ('owner', 'admin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Família não encontrada ou não tem permissão para criar backup';
  END IF;

  -- Criar registo de backup
  INSERT INTO family_backups (
    family_id,
    created_by,
    backup_type,
    status,
    metadata
  ) VALUES (
    p_family_id,
    v_user_id,
    p_backup_type,
    'processing',
    p_metadata
  ) RETURNING id INTO v_backup_id;

  -- Coletar dados da família
  SELECT jsonb_build_object(
    'family', f,
    'members', COALESCE(members_data.data, '[]'::jsonb),
    'accounts', COALESCE(accounts_data.data, '[]'::jsonb),
    'goals', COALESCE(goals_data.data, '[]'::jsonb),
    'budgets', COALESCE(budgets_data.data, '[]'::jsonb),
    'transactions', COALESCE(transactions_data.data, '[]'::jsonb),
    'categories', COALESCE(categories_data.data, '[]'::jsonb),
    'invites', COALESCE(invites_data.data, '[]'::jsonb),
    'backup_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'backup_type', p_backup_type,
      'family_name', f.nome
    )
  ) INTO v_backup_data
  FROM families f
  LEFT JOIN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'member', fm,
        'profile', p
      )
    ) as data
    FROM family_members fm
    LEFT JOIN profiles p ON p.user_id = fm.user_id
    WHERE fm.family_id = p_family_id
  ) members_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(a.*) as data
    FROM accounts a
    WHERE a.family_id = p_family_id
  ) accounts_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(g.*) as data
    FROM goals g
    WHERE g.family_id = p_family_id
  ) goals_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(b.*) as data
    FROM budgets b
    JOIN family_members fm ON fm.user_id = b.user_id
    WHERE fm.family_id = p_family_id
  ) budgets_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(t.*) as data
    FROM transactions t
    WHERE t.family_id = p_family_id
  ) transactions_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(c.*) as data
    FROM categories c
    WHERE c.family_id = p_family_id
  ) categories_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(fi.*) as data
    FROM family_invites fi
    WHERE fi.family_id = p_family_id
  ) invites_data ON true
  WHERE f.id = p_family_id;

  -- Gerar nome do ficheiro
  v_file_path := 'family-backups/' || p_family_id || '/' || v_backup_id || '_' || 
                 to_char(now(), 'YYYYMMDD_HH24MISS') || '.json';

  -- Guardar backup no storage (simulado - em produção seria guardado no Supabase Storage)
  -- Por agora, vamos apenas atualizar o registo com o caminho
  UPDATE family_backups 
  SET 
    file_path = v_file_path,
    file_size = jsonb_array_length(v_backup_data),
    status = 'completed',
    completed_at = now()
  WHERE id = v_backup_id;

  -- Criar notificação de backup concluído
  PERFORM create_family_notification(
    p_family_id,
    v_user_id,
    'Backup Concluído',
    'O backup da família foi criado com sucesso',
    'success',
    'backup',
    jsonb_build_object(
      'backup_id', v_backup_id,
      'file_path', v_file_path,
      'file_size', jsonb_array_length(v_backup_data)
    )
  );

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'file_path', v_file_path,
    'file_size', jsonb_array_length(v_backup_data),
    'message', 'Backup criado com sucesso'
  ) INTO v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Marcar backup como falhado
    UPDATE family_backups 
    SET 
      status = 'failed',
      error_message = SQLERRM,
      completed_at = now()
    WHERE id = v_backup_id;

    -- Criar notificação de erro
    PERFORM create_family_notification(
      p_family_id,
      v_user_id,
      'Erro no Backup',
      'Ocorreu um erro ao criar o backup da família',
      'error',
      'backup',
      jsonb_build_object(
        'backup_id', v_backup_id,
        'error', SQLERRM
      )
    );

    RAISE EXCEPTION 'Erro ao criar backup: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text", "p_metadata" "jsonb") IS 'Cria um backup completo dos dados de uma família';



CREATE OR REPLACE FUNCTION "public"."create_family_direct"("p_family_name" "text", "p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO families (nome, created_by, settings)
  VALUES (
    p_family_name,
    p_user_id,
    '{"allow_view_all": true, "allow_add_transactions": true, "require_approval": false}'::json
  )
  RETURNING id INTO v_family_id;
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);
  RETURN v_family_id;
END;
$$;


ALTER FUNCTION "public"."create_family_direct"("p_family_name" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text" DEFAULT 'info'::"text", "p_category" "text" DEFAULT 'system'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  
  -- Criar notificação para todos os membros da família
  INSERT INTO notifications (
    user_id,
    family_id,
    title,
    message,
    type,
    category,
    metadata,
    read,
    created_at
  )
  SELECT 
    fm.user_id,
    p_family_id,
    p_title,
    p_message,
    p_type,
    p_category,
    p_metadata,
    false,
    now()
  FROM family_members fm
  WHERE fm.family_id = p_family_id
    AND fm.user_id != p_user_id; -- Não notificar o próprio utilizador que causou o evento
END;
$$;


ALTER FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_category" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_category" "text", "p_metadata" "jsonb") IS 'Cria notificações para todos os membros de uma família';



CREATE OR REPLACE FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Inserir família
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    v_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;

  -- Adicionar utilizador como owner
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (v_user_id, v_family_id, 'owner', ARRAY['all']);

  -- Retornar resultado
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_family_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    p_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_user_id" "uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_id UUID;
  v_result JSON;
BEGIN
  -- Inserir família
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    p_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;

  -- Adicionar utilizador como owner
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);

  -- Retornar resultado
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_user_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_regular_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    return json_build_object('error', 'not_allowed');
  end if;

  v_tipo := case when p_tipo in ('receita','despesa') then p_tipo else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, p_categoria_id, abs(p_valor), coalesce(p_descricao,'Movimento regular'), p_data, v_tipo)
  returning id into v_tx_id;

  if p_goal_id is not null then
    insert into public.goal_allocations (id, goal_id, account_id, valor)
    values (gen_random_uuid(), p_goal_id, p_account_id, abs(p_valor));
  end if;

  perform public.update_account_balance(p_account_id);
  return json_build_object('transaction_id', v_tx_id);
end;
$$;


ALTER FUNCTION "public"."create_regular_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Permission denied';
  end if;

  if coalesce(p_amount,0) <= 0 then
    return jsonb_build_object('error', 'Invalid amount');
  end if;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, tipo, data, descricao)
  values (gen_random_uuid(), p_user_id, p_from_account_id, p_categoria_id, p_amount, 'despesa', coalesce(p_data, current_date), coalesce(p_description, 'Transferência'));

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, tipo, data, descricao)
  values (gen_random_uuid(), p_user_id, p_to_account_id, p_categoria_id, p_amount, 'receita', coalesce(p_data, current_date), coalesce(p_description, 'Transferência'));

  perform public.update_account_balance(p_from_account_id);
  perform public.update_account_balance(p_to_account_id);

  return jsonb_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_account_with_related_data"("p_account_id" "uuid", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_is_owner boolean := false;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then return json_build_object('success', false, 'error', 'not_allowed'); end if;

  delete from public.goal_allocations where account_id = p_account_id;
  delete from public.transactions where account_id = p_account_id;
  delete from public.accounts where id = p_account_id;
  return json_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."delete_account_with_related_data"("p_account_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_family_record RECORD;
  v_result JSON;
  v_deleted_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se a família existe e se o utilizador é o owner
  SELECT * INTO v_family_record
  FROM families
  WHERE id = p_family_id AND created_by = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Família não encontrada ou não tem permissão para eliminá-la';
  END IF;

  -- Iniciar transação para garantir consistência
  BEGIN
    -- 1. Eliminar goal_allocations relacionados a objetivos da família
    DELETE FROM goal_allocations 
    WHERE goal_id IN (
      SELECT id FROM goals WHERE family_id = p_family_id
    );
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 2. Eliminar transações da família
    DELETE FROM transactions WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 3. Eliminar orçamentos da família
    DELETE FROM budgets 
    WHERE user_id IN (
      SELECT user_id FROM family_members WHERE family_id = p_family_id
    );
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 4. Eliminar objetivos da família
    DELETE FROM goals WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 5. Eliminar contas da família
    DELETE FROM accounts WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 6. Eliminar categorias da família
    DELETE FROM categories WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 7. Eliminar convites da família
    DELETE FROM family_invites WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 8. Eliminar membros da família
    DELETE FROM family_members WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 9. Finalmente, eliminar a família
    DELETE FROM families WHERE id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- Retornar resultado
    SELECT json_build_object(
      'success', true,
      'family_id', p_family_id,
      'family_name', v_family_record.nome,
      'deleted_records', v_deleted_count,
      'message', 'Família eliminada com sucesso e todos os dados relacionados foram removidos'
    ) INTO v_result;
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RAISE EXCEPTION 'Erro ao eliminar família: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") IS 'Elimina uma família e todos os dados relacionados (cascade). Apenas o owner da família pode executar esta operação.';



CREATE OR REPLACE FUNCTION "public"."delete_goal_with_restoration"("goal_id_param" "uuid", "user_id_param" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  goal_record record;
  allocation_record record;
  total_allocated numeric := 0;
  goal_progress numeric := 0;
  account_id uuid;
  objetivos_account_id uuid;
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
  SELECT ga.account_id INTO account_id
  FROM goal_allocations ga
  WHERE ga.goal_id = goal_id_param 
  LIMIT 1;
  
  -- 4. Buscar a conta "Objetivos"
  SELECT id INTO objetivos_account_id
  FROM accounts 
  WHERE user_id = user_id_param AND nome = 'Objetivos'
  LIMIT 1;
  
  -- 5. Ajustar saldos baseado no progresso
  IF goal_progress < 100 AND account_id IS NOT NULL THEN
    -- Objetivo < 100%: NÃO fazer nada na conta origem
    -- Apenas remover as alocações - o valor voltará automaticamente para disponível
    
    -- Deduzir da conta objetivos (tanto saldo total como reservado)
    IF objetivos_account_id IS NOT NULL THEN
      UPDATE accounts 
      SET saldo = saldo - total_allocated
      WHERE id = objetivos_account_id;
    END IF;
    
  ELSIF goal_progress >= 100 AND account_id IS NOT NULL THEN
    -- Objetivo >= 100%: Deduzir da conta origem (reservado e total)
    UPDATE accounts 
    SET saldo = saldo - total_allocated
    WHERE id = account_id;
    
    -- NÃO deduzir da conta objetivos - manter saldo total, apenas reservado diminui
  END IF;
  
  -- 6. Eliminar todas as alocações do objetivo
  DELETE FROM goal_allocations WHERE goal_id = goal_id_param;
  
  -- 7. Eliminar o objetivo
  DELETE FROM goals WHERE id = goal_id_param AND user_id = user_id_param;
  
  -- 8. Retornar resultado
  result := json_build_object(
    'success', true,
    'goal_name', goal_record.nome,
    'total_allocated', total_allocated,
    'goal_progress', goal_progress,
    'restored_to_account', goal_progress < 100,
    'account_id', account_id,
    'objetivos_account_id', objetivos_account_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN 
    RAISE EXCEPTION 'Erro ao eliminar objetivo: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."delete_goal_with_restoration"("goal_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_category_for_user"("p_user_id" "uuid", "p_name" "text", "p_color" "text" DEFAULT '#6B7280'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
begin
  select id into v_id from public.categories where user_id = p_user_id and nome = p_name limit 1;
  if v_id is null then
    insert into public.categories (id, nome, cor, user_id)
    values (gen_random_uuid(), p_name, coalesce(p_color, '#6B7280'), p_user_id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."ensure_category_for_user"("p_user_id" "uuid", "p_name" "text", "p_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_transaction_family_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se family_id não foi definido, buscar da conta associada
  IF NEW.family_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT a.family_id INTO NEW.family_id
    FROM accounts a
    WHERE a.id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_transaction_family_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accounts_with_balances"("p_scope" "text" DEFAULT 'personal'::"text", "p_family_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("account_id" "uuid", "nome" "text", "tipo" "text", "family_id" "uuid", "user_id" "uuid", "saldo_atual" numeric, "reservado" numeric, "disponivel" numeric, "is_in_debt" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Log para debug
  RAISE LOG 'get_accounts_with_balances: user_id=%', v_user_id;
  
  -- Verificar se o utilizador está autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Validar parâmetros
  IF p_scope NOT IN ('personal', 'family') THEN
    RAISE EXCEPTION 'Escopo inválido. Deve ser "personal" ou "family"';
  END IF;

  IF p_scope = 'family' AND p_family_id IS NULL THEN
    RAISE EXCEPTION 'family_id é obrigatório quando scope = "family"';
  END IF;

  -- Verificar permissões para família
  IF p_scope = 'family' THEN
    IF NOT EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = p_family_id 
      AND fm.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Sem permissão para aceder a esta família';
    END IF;
  END IF;

  -- Retornar dados baseados no escopo
  RETURN QUERY
  SELECT 
    ab.account_id,
    ab.nome,
    ab.tipo,
    ab.family_id,
    ab.user_id,
    ab.saldo_atual,
    ab.reservado_final as reservado,
    ab.disponivel,
    ab.is_in_debt
  FROM account_balances_v1 ab
  WHERE 
    CASE 
      WHEN p_scope = 'personal' THEN
        -- Contas pessoais: sem family_id e pertencentes ao utilizador
        ab.family_id IS NULL AND ab.user_id = v_user_id
      WHEN p_scope = 'family' THEN
        -- Contas familiares: com family_id específico
        ab.family_id = p_family_id
      ELSE
        FALSE
    END
  ORDER BY ab.nome;
END;
$$;


ALTER FUNCTION "public"."get_accounts_with_balances"("p_scope" "text", "p_family_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accounts_with_balances"("p_scope" "text", "p_family_id" "uuid") IS 'Função RPC que retorna saldos agregados por conta, filtrados por escopo (personal/family). Resolve o problema N+1.';



CREATE OR REPLACE FUNCTION "public"."get_credit_card_summary"("p_account_id" "uuid") RETURNS TABLE("saldo" numeric, "total_gastos" numeric, "total_pagamentos" numeric, "status" "text", "ciclo_inicio" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_cycle_day int := 1;
  v_today date := current_date;
  v_cycle_start date;
begin
  select coalesce(billing_cycle_day, 1) into v_cycle_day from public.accounts where id = p_account_id;
  v_cycle_start := date_trunc('month', v_today) + ((v_cycle_day - 1) || ' days')::interval;
  if v_today < v_cycle_start then
    v_cycle_start := (date_trunc('month', v_today) - interval '1 month') + ((v_cycle_day - 1) || ' days')::interval;
  end if;

  return query
  with tx as (
    select * from public.transactions where account_id = p_account_id and data >= v_cycle_start::date
  )
  select 
    (select saldo_atual from public.account_balances where account_id = p_account_id) as saldo,
    coalesce((select sum(valor) from tx where tipo = 'despesa'),0)::numeric(15,2) as total_gastos,
    coalesce((select sum(valor) from tx where tipo = 'receita'),0)::numeric(15,2) as total_pagamentos,
    case when (select saldo_atual from public.account_balances where account_id = p_account_id) <= 0 then 'EM_DÍVIDA' else 'OK' end as status,
    to_char(v_cycle_start, 'YYYY-MM-DD') as ciclo_inicio;
end;
$$;


ALTER FUNCTION "public"."get_credit_card_summary"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_credit_card_summary"("p_user_id" "uuid", "p_account_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_total_expenses NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_current_balance NUMERIC := 0;
  v_available_credit NUMERIC := 0;
  v_credit_limit NUMERIC := 0;
BEGIN
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

  -- Calculate totals from ALL transactions (including adjustments)
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
  INTO v_total_expenses, v_total_payments
  FROM transactions
  WHERE account_id = p_account_id;

  -- The current balance should reflect the actual account saldo
  v_current_balance := v_account.saldo;

  v_available_credit := GREATEST(0, v_credit_limit + v_current_balance);

  v_result := jsonb_build_object(
    'success', true,
    'account_name', v_account.nome,
    'current_balance', v_current_balance,
    'total_expenses', v_total_expenses,
    'total_payments', v_total_payments,
    'available_credit', v_available_credit,
    'credit_limit', v_credit_limit,
    'is_in_debt', v_current_balance < 0,
    'debt_amount', CASE WHEN v_current_balance < 0 THEN ABS(v_current_balance) ELSE 0 END,
    'summary', CASE
      WHEN v_current_balance < 0 THEN
        'Dívida de ' || ABS(v_current_balance) || '€'
      WHEN v_current_balance = 0 THEN
        'Saldo zerado'
      ELSE
        'Crédito disponível de ' || v_current_balance || '€'
    END
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_credit_card_summary"("p_user_id" "uuid", "p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_accounts_with_balances"("p_user_id" "uuid") RETURNS TABLE("account_id" "uuid", "user_id" "uuid", "family_id" "uuid", "nome" "text", "tipo" "text", "saldo_atual" numeric, "total_reservado" numeric, "saldo_disponivel" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select 
    a.id as account_id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    ab.saldo_atual,
    coalesce(ar.total_reservado, 0)::numeric(15,2) as total_reservado,
    (ab.saldo_atual - coalesce(ar.total_reservado, 0))::numeric(15,2) as saldo_disponivel
  from public.accounts a
  left join public.account_balances ab on ab.account_id = a.id
  left join public.account_reserved ar on ar.account_id = a.id
  where a.family_id in (
    select fm.family_id from public.family_members fm where fm.user_id = p_user_id
  )
  order by a.nome;
$$;


ALTER FUNCTION "public"."get_family_accounts_with_balances"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.family_id = p_family_id 
      AND fm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Não tem permissão para aceder a esta família';
  END IF;

  -- Obter estatísticas
  SELECT jsonb_build_object(
    'total_backups', COUNT(*),
    'completed_backups', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending_backups', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_size', COALESCE(SUM(file_size), 0),
    'latest_backup', MAX(created_at) FILTER (WHERE status = 'completed'),
    'oldest_backup', MIN(created_at) FILTER (WHERE status = 'completed')
  ) INTO v_result
  FROM family_backups
  WHERE family_id = p_family_id;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") IS 'Obtém estatísticas de backup de uma família';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "mes" character varying(7) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid",
    CONSTRAINT "budgets_mes_check" CHECK ((("mes")::"text" ~ '^\d{4}-\d{2}$'::"text")),
    CONSTRAINT "budgets_valor_check" CHECK (("valor" > (0)::numeric))
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."budgets"."family_id" IS 'Referência à família. NULL para orçamentos pessoais.';



CREATE OR REPLACE FUNCTION "public"."get_family_budgets"("p_user_id" "uuid") RETURNS SETOF "public"."budgets"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select b.* from public.budgets b
  where b.family_id in (select fm.family_id from public.family_members fm where fm.user_id = p_user_id);
$$;


ALTER FUNCTION "public"."get_family_budgets"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_data_by_id"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE user_id = auth.uid() AND family_id = p_family_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Acesso negado');
  END IF;
  
  BEGIN
    SELECT json_build_object(
      'success', true,
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      )
    ) INTO v_result
    FROM families f
    WHERE f.id = p_family_id;
    
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    ELSE
      RETURN json_build_object('success', false, 'message', 'Família não encontrada');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_family_data_by_id: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Erro interno do servidor');
  END;
END;
$$;


ALTER FUNCTION "public"."get_family_data_by_id"("p_family_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "valor_atual" numeric(10,2) DEFAULT 0,
    "prazo" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid",
    "valor_objetivo" numeric(10,2) DEFAULT 0 NOT NULL,
    "ativa" boolean DEFAULT true,
    "status" character varying(16) DEFAULT 'active'::character varying,
    "valor_meta" numeric(10,2),
    "account_id" "uuid",
    CONSTRAINT "goals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_goals"("p_user_id" "uuid") RETURNS SETOF "public"."goals"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select g.* from public.goals g
  where g.family_id in (select fm.family_id from public.family_members fm where fm.user_id = p_user_id);
$$;


ALTER FUNCTION "public"."get_family_goals"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_kpis"() RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_members" integer, "pending_invites" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with my_families as (
    select fm.family_id from public.family_members fm where fm.user_id = auth.uid()
  ),
  fam_accounts as (
    select * from public.accounts a where a.family_id in (select family_id from my_families)
  ),
  balances as (
    select ab.* from public.account_balances ab join fam_accounts a on a.id = ab.account_id
  ),
  tx as (
    select t.* from public.transactions t join fam_accounts a on a.id = t.account_id
  ),
  tx_month as (
    select * from tx where date_trunc('month', data) = date_trunc('month', current_date)
  ),
  cat_transfer as (
    select id from public.categories where nome ilike 'transfer%'
  ),
  tx_stats as (
    select 
      coalesce(sum(case when t.tipo='receita' and t.categoria_id not in (select id from cat_transfer) then t.valor else 0 end),0) as receitas,
      coalesce(sum(case when t.tipo='despesa' and t.categoria_id not in (select id from cat_transfer) then t.valor else 0 end),0) as despesas
    from tx_month t
  ),
  goals as (
    select g.*, least(case when g.valor_objetivo>0 then (g.valor_atual/g.valor_objetivo)*100 else 0 end, 100) as progress
    from public.goals g where g.family_id in (select family_id from my_families)
  )
  select 
    coalesce(sum(b.saldo_atual),0)::numeric(15,2) as total_balance,
    coalesce(sum(case when a.tipo = 'cartão de crédito' then least(b.saldo_atual,0) else 0 end) * -1, 0)::numeric(15,2) as credit_card_debt,
    coalesce(max(goals.progress),0)::numeric(5,2) as top_goal_progress,
    (select (tx_stats.receitas - tx_stats.despesas) from tx_stats)::numeric(15,2) as monthly_savings,
    0::numeric(15,2) as goals_account_balance,
    coalesce(sum((select valor_objetivo from public.goals gg where gg.id = g.id)),0)::numeric(15,2) as total_goals_value,
    coalesce(avg(goals.progress),0)::numeric(5,2) as goals_progress_percentage,
    coalesce((select count(*) from public.family_members fm join my_families f on f.family_id = fm.family_id),0)::int as total_members,
    0::int as pending_invites;
end;
$$;


ALTER FUNCTION "public"."get_family_kpis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_kpis_with_user"("p_user_id" "uuid") RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric, "total_members" integer, "pending_invites" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
  total_members_val INTEGER := 0;
  pending_invites_val INTEGER := 0;
  current_family_id UUID;
BEGIN
  -- If no user is provided, return zeros
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage,
      0 as total_members,
      0 as pending_invites;
    RETURN;
  END IF;
  
  -- Get current family ID for the user
  SELECT family_id INTO current_family_id
  FROM family_members 
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If no family found, return zeros
  IF current_family_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage,
      0 as total_members,
      0 as pending_invites;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt for family
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM public.accounts 
  WHERE family_id = current_family_id;
  
  -- Calculate goals account balance for family (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM public.accounts 
  WHERE family_id = current_family_id
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value for family
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM public.goals 
  WHERE family_id = current_family_id;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress for family
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM public.goals 
  WHERE family_id = current_family_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings for family
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM public.transactions 
  WHERE family_id = current_family_id
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values for family (using budgets table)
  SELECT 
    COALESCE(SUM(valor), 0)
  INTO total_budget_amount_val
  FROM public.budgets 
  WHERE family_id = current_family_id;
  
  -- For family budgets, we'll set spent to 0 for now (can be calculated from transactions later)
  total_budget_spent_val := 0;
  
  -- Calculate total members
  SELECT COUNT(*) INTO total_members_val
  FROM family_members 
  WHERE family_id = current_family_id;
  
  -- Calculate pending invites
  SELECT COUNT(*) INTO pending_invites_val
  FROM family_invites 
  WHERE family_id = current_family_id AND status = 'pending';
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage,
    total_members_val as total_members,
    pending_invites_val as pending_invites;
END;
$$;


ALTER FUNCTION "public"."get_family_kpis_with_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_members_simple"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter membros da família com perfis (sem verificação de autenticação)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM family_members fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  WHERE fm.family_id = p_family_id
  ORDER BY fm.joined_at ASC;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_simple: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$$;


ALTER FUNCTION "public"."get_family_members_simple"("p_family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_members_test"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter membros da família com perfis e emails (corrigido)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, 'Email não disponível'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM (
    SELECT 
      fm.id,
      fm.user_id,
      fm.family_id,
      fm.role,
      fm.joined_at
    FROM family_members fm
    WHERE fm.family_id = p_family_id
    ORDER BY fm.joined_at ASC
  ) fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_members_test: Retornando % membros para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_test: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$$;


ALTER FUNCTION "public"."get_family_members_test"("p_family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_members_with_profiles"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Verificar se há utilizador autenticado
  IF v_user_id IS NULL THEN
    RAISE LOG 'get_family_members_with_profiles: Utilizador não autenticado';
    RETURN '[]'::json;
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE LOG 'get_family_members_with_profiles: Utilizador % não é membro da família %', v_user_id, p_family_id;
    RETURN '[]'::json;
  END IF;

  -- Obter membros da família com perfis e emails (corrigido)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, 'Email não disponível'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM (
    SELECT 
      fm.id,
      fm.user_id,
      fm.family_id,
      fm.role,
      fm.joined_at
    FROM family_members fm
    WHERE fm.family_id = p_family_id
    ORDER BY fm.joined_at ASC
  ) fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_members_with_profiles: Retornando % membros para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_with_profiles: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$$;


ALTER FUNCTION "public"."get_family_members_with_profiles"("p_family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_pending_invites"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Verificar se há utilizador autenticado
  IF v_user_id IS NULL THEN
    RAISE LOG 'get_family_pending_invites: Utilizador não autenticado';
    RETURN '[]'::json;
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE LOG 'get_family_pending_invites: Utilizador % não é membro da família %', v_user_id, p_family_id;
    RETURN '[]'::json;
  END IF;

  -- Obter convites pendentes
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'invited_by', fi.invited_by,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at
    )
  ) INTO v_result
  FROM family_invites fi
  WHERE fi.family_id = p_family_id AND fi.status = 'pending'
  ORDER BY fi.created_at DESC;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_pending_invites: Retornando % convites para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_family_pending_invites: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;


ALTER FUNCTION "public"."get_family_pending_invites"("p_family_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_statistics"("p_family_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;

  -- Calcular estatísticas
  SELECT json_build_object(
    'total_members', (
      SELECT COUNT(*) FROM family_members WHERE family_id = p_family_id
    ),
    'pending_invites', (
      SELECT COUNT(*) FROM family_invites WHERE family_id = p_family_id AND status = 'pending'
    ),
    'shared_goals', (
      SELECT COUNT(*) FROM goals WHERE family_id = p_family_id
    ),
    'total_transactions', (
      SELECT COUNT(*) FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.family_id = p_family_id
    ),
    'total_budgets', (
      SELECT COUNT(*) FROM budgets WHERE family_id = p_family_id
    ),
    'recent_activity', (
      SELECT json_agg(
        json_build_object(
          'type', 'transaction',
          'description', t.descricao,
          'amount', t.valor,
          'date', t.data,
          'user', p.nome
        )
      )
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN family_members fm ON a.user_id = fm.user_id
      JOIN profiles p ON fm.user_id = p.user_id
      WHERE fm.family_id = p_family_id
      ORDER BY t.data DESC
      LIMIT 10
    )
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_family_statistics: %', SQLERRM;
  RETURN json_build_object('error', 'Erro ao obter estatísticas');
END;
$$;


ALTER FUNCTION "public"."get_family_statistics"("p_family_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "data" "date" NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "descricao" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid",
    "account_id" "uuid" NOT NULL,
    "goal_id" "uuid",
    CONSTRAINT "transactions_tipo_check" CHECK (("tipo" = ANY (ARRAY['receita'::"text", 'despesa'::"text", 'transferencia'::"text"]))),
    CONSTRAINT "transactions_valor_min" CHECK (("valor" >= 0.01))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_transactions"() RETURNS SETOF "public"."transactions"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.transactions t
  where t.family_id in (select family_id from public.family_members where user_id = auth.uid())
  order by t.data desc, t.created_at desc;
$$;


ALTER FUNCTION "public"."get_family_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_index_usage_stats"() RETURNS TABLE("index_name" "text", "table_name" "text", "index_size" "text", "index_scans" bigint, "index_tuples_read" bigint, "index_tuples_fetched" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname::text,
        t.relname::text,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::text,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_indexes i
    JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
    JOIN pg_stat_user_tables t ON s.relname = t.relname
    WHERE i.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$;


ALTER FUNCTION "public"."get_index_usage_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_accounts_with_balances"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "family_id" "uuid", "nome" "text", "tipo" "text", "saldo" numeric, "saldo_atual" numeric, "total_reservado" numeric, "saldo_disponivel" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    a.saldo,
    abwr.saldo_atual,
    abwr.total_reservado,
    abwr.saldo_disponivel,
    a.created_at
  FROM accounts a
  LEFT JOIN account_balances_with_reserved abwr ON abwr.account_id = a.id
  WHERE a.user_id = COALESCE(p_user_id, auth.uid())
    AND a.family_id IS NULL
  ORDER BY a.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_personal_accounts_with_balances"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_budgets"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "categoria_id" "uuid", "categoria_nome" "text", "categoria_cor" "text", "mes" character varying, "valor_orcamento" numeric, "valor_gasto" numeric, "valor_restante" numeric, "progresso_percentual" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    bp.budget_id as id,
    bp.user_id,
    bp.categoria_id,
    bp.categoria_nome,
    bp.categoria_cor,
    bp.mes,
    bp.valor_orcamento,
    bp.valor_gasto,
    bp.valor_restante,
    bp.progresso_percentual
  FROM budget_progress bp
  WHERE bp.user_id = auth.uid()
  ORDER BY bp.mes DESC;
END;
$$;


ALTER FUNCTION "public"."get_personal_budgets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_goals"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "nome" "text", "valor_objetivo" numeric, "valor_atual" numeric, "prazo" "date", "ativa" boolean, "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get personal goals (family_id IS NULL)
    RETURN QUERY
    SELECT 
      g.id,
      g.nome,
      g.valor_objetivo,
      g.valor_atual,
      g.prazo,
      g.ativa,
      g.user_id,
      g.created_at,
      g.updated_at
    FROM goals g
    WHERE g.user_id = v_user_id
      AND g.family_id IS NULL
    ORDER BY g.created_at DESC;
  END;
END;
$$;


ALTER FUNCTION "public"."get_personal_goals"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_kpis"() RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_user_id UUID;
  current_month TEXT;
  v_total_balance DECIMAL(10,2) := 0;
  v_credit_card_debt DECIMAL(10,2) := 0;
  v_goals_account_balance DECIMAL(10,2) := 0;
  v_total_goals_value DECIMAL(10,2) := 0;
  v_top_goal_progress DECIMAL(5,2) := 0;
  v_monthly_savings DECIMAL(10,2) := 0;
  v_budget_spent DECIMAL(10,2) := 0;
  v_budget_amount DECIMAL(10,2) := 0;
  v_budget_percentage DECIMAL(5,2) := 0;
  v_goals_progress_percentage DECIMAL(5,2) := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Query 1: Calcular saldos e dívidas de cartão (otimizada)
  SELECT 
    COALESCE(SUM(CASE WHEN a.tipo != 'cartão de crédito' THEN a.saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.tipo = 'cartão de crédito' AND a.saldo < 0 THEN ABS(a.saldo) ELSE 0 END), 0)
  INTO v_total_balance, v_credit_card_debt
  FROM accounts a
  WHERE a.user_id = v_user_id AND a.family_id IS NULL;
  
  -- Query 2: Calcular objetivos (otimizada)
  SELECT 
    COALESCE(SUM(valor_objetivo), 0),
    COALESCE(
      (SELECT a.saldo 
       FROM accounts a 
       WHERE a.user_id = v_user_id 
         AND a.family_id IS NULL 
         AND (LOWER(a.nome) LIKE '%objetivo%' OR LOWER(a.tipo) LIKE '%objetivo%')
       LIMIT 1), 0
    )
  INTO v_total_goals_value, v_goals_account_balance
  FROM goals 
  WHERE user_id = v_user_id AND family_id IS NULL;
  
  -- Calcular percentagem de progresso dos objetivos
  IF v_total_goals_value > 0 THEN
    v_goals_progress_percentage := (v_goals_account_balance / v_total_goals_value) * 100;
  END IF;
  
  -- Query 3: Calcular progresso do objetivo principal
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO v_top_goal_progress
  FROM goals 
  WHERE user_id = v_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Query 4: Calcular poupança mensal (otimizada com índice)
  SELECT 
    COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0)
  INTO v_monthly_savings
  FROM transactions t
  WHERE t.user_id = v_user_id 
    AND t.family_id IS NULL
    AND t.data::text LIKE current_month || '%';
  
  -- Query 5: Calcular orçamentos (ajustada para estrutura real)
  SELECT 
    COALESCE(SUM(b.valor), 0),
    COALESCE(SUM(b.valor), 0) -- Simplificado para teste
  INTO v_budget_amount, v_budget_spent
  FROM budgets b
  WHERE b.user_id = v_user_id 
    AND b.family_id IS NULL
    AND b.mes = current_month;
  
  -- Calcular percentagem de orçamento gasto
  IF v_budget_amount > 0 THEN
    v_budget_percentage := (v_budget_spent / v_budget_amount) * 100;
  END IF;
  
  -- Return results
  RETURN QUERY
  SELECT 
    v_total_balance as total_balance,
    v_credit_card_debt as credit_card_debt,
    v_top_goal_progress as top_goal_progress,
    v_monthly_savings as monthly_savings,
    v_goals_account_balance as goals_account_balance,
    v_total_goals_value as total_goals_value,
    v_goals_progress_percentage as goals_progress_percentage,
    v_budget_spent as total_budget_spent,
    v_budget_amount as total_budget_amount,
    v_budget_percentage as budget_spent_percentage;
END;
$$;


ALTER FUNCTION "public"."get_personal_kpis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_kpis_debug"() RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- If no user is authenticated, return zeros
  IF current_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt (bypass RLS)
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM public.accounts 
  WHERE user_id = current_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (bypass RLS)
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM public.accounts 
  WHERE user_id = current_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value (bypass RLS)
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM public.goals 
  WHERE user_id = current_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress (bypass RLS)
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM public.goals 
  WHERE user_id = current_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately (bypass RLS)
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM public.transactions 
  WHERE user_id = current_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately (bypass RLS)
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM public.budget_progress 
  WHERE user_id = current_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$$;


ALTER FUNCTION "public"."get_personal_kpis_debug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_kpis_test"("p_user_id" "uuid") RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
BEGIN
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN QUERY
  SELECT
    -- Total balance (regular accounts only)
    COALESCE(SUM(CASE WHEN a.tipo != 'cartão de crédito' THEN a.saldo ELSE 0 END), 0) as total_balance,
    
    -- Credit card debt
    COALESCE(SUM(CASE WHEN a.tipo = 'cartão de crédito' AND a.saldo < 0 THEN ABS(a.saldo) ELSE 0 END), 0) as credit_card_debt,
    
    -- Top goal progress
    top_goal_prog as top_goal_progress,
    
    -- Monthly savings (simplified calculation)
    COALESCE(SUM(CASE 
      WHEN to_char(t.data, 'YYYY-MM') = current_month AND t.tipo = 'receita' THEN t.valor
      ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
      WHEN to_char(t.data, 'YYYY-MM') = current_month AND t.tipo = 'despesa' THEN t.valor
      ELSE 0 
    END), 0) as monthly_savings,
    
    -- Goals account balance
    goals_account_bal as goals_account_balance,
    
    -- Total goals value
    total_goals_val as total_goals_value,
    
    -- Goals progress percentage
    goals_progress_percentage as goals_progress_percentage,
    
    -- Total budget spent
    COALESCE(SUM(bp.valor_gasto), 0) as total_budget_spent,
    
    -- Total budget amount
    COALESCE(SUM(bp.valor_orcamento), 0) as total_budget_amount,
    
    -- Budget spent percentage
    CASE 
      WHEN COALESCE(SUM(bp.valor_orcamento), 0) > 0 
      THEN (COALESCE(SUM(bp.valor_gasto), 0) / COALESCE(SUM(bp.valor_orcamento), 0)) * 100
      ELSE 0 
    END as budget_spent_percentage
    
  FROM accounts a
  LEFT JOIN transactions t ON t.user_id = p_user_id AND t.family_id IS NULL
  LEFT JOIN budget_progress bp ON bp.user_id = p_user_id
  WHERE a.user_id = p_user_id AND a.family_id IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_personal_kpis_test"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_kpis_test_fixed"("p_user_id" "uuid") RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
BEGIN
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM accounts 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM transactions 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM budget_progress 
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$$;


ALTER FUNCTION "public"."get_personal_kpis_test_fixed"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_kpis_with_user"("p_user_id" "uuid") RETURNS TABLE("total_balance" numeric, "credit_card_debt" numeric, "top_goal_progress" numeric, "monthly_savings" numeric, "goals_account_balance" numeric, "total_goals_value" numeric, "goals_progress_percentage" numeric, "total_budget_spent" numeric, "total_budget_amount" numeric, "budget_spent_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
BEGIN
  -- If no user is provided, return zeros
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM accounts 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM transactions 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM budget_progress 
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$$;


ALTER FUNCTION "public"."get_personal_kpis_with_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_transactions"() RETURNS SETOF "public"."transactions"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select * from public.transactions t
  where t.user_id = auth.uid() and t.family_id is null
  order by t.data desc, t.created_at desc;
$$;


ALTER FUNCTION "public"."get_personal_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personal_transactions_fast"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "valor" numeric, "data" "date", "categoria_id" "uuid", "tipo" "text", "descricao" character varying, "created_at" timestamp with time zone, "family_id" "uuid", "account_id" "uuid", "goal_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH user_transactions AS (
    SELECT t.*
    FROM transactions t
    WHERE t.user_id = auth.uid()
      AND t.family_id IS NULL
  )
  SELECT 
    ut.id,
    ut.user_id,
    ut.valor,
    ut.data,
    ut.categoria_id,
    ut.tipo,
    ut.descricao,
    ut.created_at,
    ut.family_id,
    ut.account_id,
    ut.goal_id
  FROM user_transactions ut
  ORDER BY ut.data DESC, ut.created_at DESC
  LIMIT 50; -- Reduzir ainda mais para melhor performance
END;
$$;


ALTER FUNCTION "public"."get_personal_transactions_fast"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_account_balances"() RETURNS TABLE("account_id" "uuid", "saldo_atual" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select ab.account_id, ab.saldo_atual
  from public.account_balances ab
  join public.accounts a on a.id = ab.account_id
  where a.user_id = auth.uid() and a.family_id is null;
$$;


ALTER FUNCTION "public"."get_user_account_balances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_account_reserved"() RETURNS TABLE("account_id" "uuid", "total_reservado" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select ar.account_id, ar.total_reservado
  from public.account_reserved ar
  join public.accounts a on a.id = ar.account_id
  where a.user_id = auth.uid() and a.family_id is null;
$$;


ALTER FUNCTION "public"."get_user_account_reserved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accounts_with_balances"() RETURNS TABLE("account_id" "uuid", "nome" "text", "user_id" "uuid", "tipo" "text", "saldo_atual" numeric, "total_reservado" numeric, "saldo_disponivel" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Get accounts with balances for the current user
  RETURN QUERY
  SELECT 
    a.id as account_id,
    a.nome,
    a.user_id,
    a.tipo,
    COALESCE(ab.saldo_atual, 0) as saldo_atual,
    COALESCE(ar.total_reservado, 0) as total_reservado,
    COALESCE(ab.saldo_atual, 0) - COALESCE(ar.total_reservado, 0) as saldo_disponivel
  FROM accounts a
  LEFT JOIN account_balances ab ON ab.account_id = a.id
  LEFT JOIN account_reserved ar ON ar.account_id = a.id
  WHERE a.user_id = auth.uid()
  ORDER BY a.nome;
END;
$$;


ALTER FUNCTION "public"."get_user_accounts_with_balances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accounts_with_balances"("p_user_id" "uuid") RETURNS TABLE("account_id" "uuid", "user_id" "uuid", "family_id" "uuid", "nome" "text", "tipo" "text", "saldo_atual" numeric, "total_reservado" numeric, "saldo_disponivel" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select 
    a.id as account_id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    ab.saldo_atual,
    coalesce(ar.total_reservado, 0)::numeric(15,2) as total_reservado,
    (ab.saldo_atual - coalesce(ar.total_reservado, 0))::numeric(15,2) as saldo_disponivel
  from public.accounts a
  left join public.account_balances ab on ab.account_id = a.id
  left join public.account_reserved ar on ar.account_id = a.id
  where a.user_id = p_user_id and a.family_id is null
  order by a.nome;
$$;


ALTER FUNCTION "public"."get_user_accounts_with_balances"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_all_transactions"() RETURNS TABLE("id" "uuid", "valor" numeric, "tipo" "text", "data" "date", "descricao" character varying, "user_id" "uuid", "family_id" "uuid", "categoria_id" "uuid", "account_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Get the current user ID from auth context
  RETURN QUERY
  SELECT 
      t.id,
      t.valor,
      t.tipo,
      t.data,
      t.descricao,
      t.user_id,
      t.family_id,
      t.categoria_id,
      t.account_id
  FROM transactions t
  WHERE (
      -- Personal transactions (user's own transactions)
      (t.user_id = auth.uid() AND t.family_id IS NULL)
      OR
      -- Family transactions (transactions from user's families)
      (t.family_id IS NOT NULL AND t.family_id IN (
          SELECT fm.family_id
          FROM family_members fm
          WHERE fm.user_id = auth.uid()
      ))
  )
  ORDER BY t.data DESC, t.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_all_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_all_transactions"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "valor" numeric, "tipo" "text", "data" "date", "descricao" "text", "modo" "text", "user_id" "uuid", "family_id" "uuid", "categoria_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  RETURN QUERY
  SELECT 
      t.id,
      t.valor,
      t.tipo,
      t.data,
      t.descricao,
      t.modo,
      t.user_id,
      t.family_id,
      t.categoria_id
  FROM transactions t
  WHERE (
      (t.user_id = p_user_id AND t.family_id IS NULL)
      OR
      (t.family_id IS NOT NULL AND t.family_id IN (
          SELECT get_user_families(p_user_id)
      ))
  );
END;
$$;


ALTER FUNCTION "public"."get_user_all_transactions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_budget_progress"() RETURNS TABLE("budget_id" "uuid", "categoria_id" "uuid", "categoria_nome" "text", "categoria_cor" "text", "valor_orcamento" numeric, "valor_gasto" numeric, "valor_restante" numeric, "progresso_percentual" numeric, "mes" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.budget_id,
        bp.categoria_id,
        bp.categoria_nome,
        bp.categoria_cor,
        bp.valor_orcamento,
        bp.valor_gasto,
        bp.valor_restante,
        bp.progresso_percentual,
        bp.mes
    FROM budget_progress bp
    WHERE bp.user_id = auth.uid()
    ORDER BY bp.mes DESC, bp.categoria_nome;
END;
$$;


ALTER FUNCTION "public"."get_user_budget_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_families"() RETURNS TABLE("family_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  RETURN QUERY
  SELECT fm.family_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_families"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_families"("p_user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  RETURN QUERY
  SELECT family_id
  FROM family_members
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_families"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_family_data"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'null'::json;
  END IF;

  BEGIN
    SELECT json_build_object(
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      ),
      'user_role', fm.role,
      'member_count', (
        SELECT COUNT(*) 
        FROM family_members fm2 
        WHERE fm2.family_id = f.id
      ),
      'pending_invites_count', (
        SELECT COUNT(*) 
        FROM family_invites fi 
        WHERE fi.family_id = f.id AND fi.status = 'pending'
      ),
      'shared_goals_count', (
        SELECT COUNT(*) 
        FROM goals g 
        WHERE g.family_id = f.id
      )
    ) INTO v_result
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.user_id = v_user_id
    LIMIT 1;
    
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    ELSE
      RETURN 'null'::json;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_user_family_data: %', SQLERRM;
    RETURN 'null'::json;
  END;
END;
$$;


ALTER FUNCTION "public"."get_user_family_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_family_data"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  BEGIN
    SELECT json_build_object(
      'success', true,
      'family_member', json_build_object(
        'id', fm.id,
        'user_id', fm.user_id,
        'family_id', fm.family_id,
        'role', fm.role,
        'permissions', fm.permissions,
        'joined_at', fm.joined_at
      ),
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      ),
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, '')
      )
    ) INTO v_result
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    LEFT JOIN profiles p ON fm.user_id = p.user_id
    LEFT JOIN auth.users au ON fm.user_id = au.id
    WHERE fm.user_id = p_user_id
    LIMIT 1;
    IF v_result IS NOT NULL THEN
      RETURN json_build_array(v_result);
    ELSE
      RETURN '[]'::json;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_user_family_data: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Erro interno do servidor');
  END;
END;
$$;


ALTER FUNCTION "public"."get_user_family_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_financial_summary"() RETURNS TABLE("total_saldo_contas" numeric, "total_reservado_objetivos" numeric, "total_saldo_disponivel" numeric, "total_contas" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.total_saldo_contas,
        fs.total_reservado_objetivos,
        fs.total_saldo_disponivel,
        fs.total_contas
    FROM financial_summary fs
    WHERE fs.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_goal_progress"() RETURNS TABLE("goal_id" "uuid", "nome" "text", "valor_objetivo" numeric, "total_alocado" numeric, "progresso_percentual" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select 
    gp.goal_id,
    gp.nome,
    gp.valor_objetivo,
    gp.total_alocado,
    gp.progresso_percentual
  from goal_progress gp
  where exists (
    select 1 from goals g 
    where g.id = gp.goal_id 
    and g.user_id = auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."get_user_goal_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_pending_family_invites"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_email text;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter email do utilizador
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Obter convites pendentes
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'family_name', f.nome,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'invited_by', fi.invited_by,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at
    )
  ) INTO v_result
  FROM family_invites fi
  JOIN families f ON fi.family_id = f.id
  WHERE fi.email = v_user_email AND fi.status = 'pending'
  ORDER BY fi.created_at DESC;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_user_pending_family_invites: %', SQLERRM;
  RETURN '[]'::json;
END;
$$;


ALTER FUNCTION "public"."get_user_pending_family_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_transactions_detailed"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_account_id" "uuid" DEFAULT NULL::"uuid", "p_categoria_id" "uuid" DEFAULT NULL::"uuid", "p_tipo" "text" DEFAULT NULL::"text", "p_data_inicio" "date" DEFAULT NULL::"date", "p_data_fim" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "valor" numeric, "data" "date", "tipo" "text", "descricao" character varying, "created_at" timestamp with time zone, "account_id" "uuid", "account_nome" "text", "account_tipo" "text", "categoria_id" "uuid", "categoria_nome" "text", "categoria_cor" "text", "goal_id" "uuid", "goal_nome" "text", "family_id" "uuid", "family_nome" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.id,
        td.valor,
        td.data,
        td.tipo,
        td.descricao,
        td.created_at,
        td.account_id,
        td.account_nome,
        td.account_tipo,
        td.categoria_id,
        td.categoria_nome,
        td.categoria_cor,
        td.goal_id,
        td.goal_nome,
        td.family_id,
        td.family_nome
    FROM transactions_detailed td
    WHERE td.user_id = auth.uid()
        AND (p_account_id IS NULL OR td.account_id = p_account_id)
        AND (p_categoria_id IS NULL OR td.categoria_id = p_categoria_id)
        AND (p_tipo IS NULL OR td.tipo = p_tipo)
        AND (p_data_inicio IS NULL OR td.data >= p_data_inicio)
        AND (p_data_fim IS NULL OR td.data <= p_data_fim)
    ORDER BY td.data DESC, td.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_transactions_detailed"("p_limit" integer, "p_offset" integer, "p_account_id" "uuid", "p_categoria_id" "uuid", "p_tipo" "text", "p_data_inicio" "date", "p_data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_budget_exceeded"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_category_name text;
  v_user_name text;
  v_budget_amount numeric;
  v_spent_amount numeric;
  v_progress_percent numeric;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Calcular gasto real para este orçamento
  SELECT 
    b.valor,
    COALESCE(SUM(t.valor), 0),
    CASE 
      WHEN b.valor > 0 THEN (COALESCE(SUM(t.valor), 0) / b.valor) * 100
      ELSE 0
    END
  INTO v_budget_amount, v_spent_amount, v_progress_percent
  FROM budgets b
  LEFT JOIN transactions t ON t.categoria_id = b.categoria_id 
    AND t.user_id = b.user_id
    AND DATE_TRUNC('month', t.data::date) = DATE_TRUNC('month', b.mes::date)
  WHERE b.id = NEW.id
  GROUP BY b.valor;
  
  -- Se o orçamento foi excedido (mais de 100%)
  IF v_progress_percent > 100 THEN
    -- Obter nome da família (através do utilizador)
    SELECT f.nome INTO v_family_name
    FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.user_id = NEW.user_id
    LIMIT 1;
    
    -- Obter nome da categoria
    SELECT nome INTO v_category_name
    FROM categories
    WHERE id = NEW.categoria_id;
    
    -- Obter nome do utilizador
    SELECT nome INTO v_user_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      (SELECT family_id FROM family_members WHERE user_id = NEW.user_id LIMIT 1),
      NEW.user_id,
      'Orçamento Excedido',
      'O orçamento de ' || v_category_name || ' foi excedido em ' || v_progress_percent || '% (' || v_spent_amount || '€ de ' || v_budget_amount || '€)',
      'error',
      'budget',
      jsonb_build_object(
        'budget_id', NEW.id,
        'category_name', v_category_name,
        'budget_amount', v_budget_amount,
        'spent_amount', v_spent_amount,
        'progress_percent', v_progress_percent,
        'user_name', v_user_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_budget_exceeded"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_budget_exceeded"() IS 'Trigger que cria notificação quando um orçamento é excedido';



CREATE OR REPLACE FUNCTION "public"."handle_credit_card_account"("p_account_id" "uuid", "p_user_id" "uuid", "p_operation" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_is_owner boolean := false;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then return false; end if;

  -- Placeholder: could initialize metadata; keep idempotent
  update public.accounts set billing_cycle_day = coalesce(billing_cycle_day, 1) where id = p_account_id;
  return true;
end;
$$;


ALTER FUNCTION "public"."handle_credit_card_account"("p_account_id" "uuid", "p_user_id" "uuid", "p_operation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_valor" numeric, "p_data" "date", "p_categoria_id" "uuid", "p_tipo" "text", "p_descricao" "text" DEFAULT NULL::"text", "p_goal_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
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
  
  -- Verificar se a categoria existe
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_categoria_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Categoria não encontrada'
    );
  END IF;
  
  -- Verificar se o valor é válido
  IF p_valor <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'O valor deve ser maior que zero'
    );
  END IF;
  
  -- Lógica específica para cartões de crédito
  BEGIN
    -- Para cartões de crédito:
    -- - DESPESAS: aumentam a dívida (saldo fica mais negativo)
    -- - RECEITAS: diminuem a dívida (saldo fica menos negativo ou positivo)
    
    CASE p_tipo
      WHEN 'despesa' THEN
        -- Despesa aumenta a dívida (saldo fica mais negativo)
        v_new_balance := v_account.saldo - p_valor;
        
      WHEN 'receita' THEN
        -- Receita diminui a dívida (saldo fica menos negativo ou positivo)
        v_new_balance := v_account.saldo + p_valor;
        
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Tipo de transação inválido para cartão de crédito'
        );
    END CASE;
    
    -- Criar a transação
    INSERT INTO transactions (
      user_id,
      account_id,
      valor,
      data,
      categoria_id,
      tipo,
      descricao,
      goal_id
    ) VALUES (
      p_user_id,
      p_account_id,
      p_valor,
      p_data,
      p_categoria_id,
      p_tipo,
      COALESCE(p_descricao, 'Transação em cartão de crédito'),
      p_goal_id
    ) RETURNING id INTO v_transaction_id;
    
    -- Atualizar o saldo da conta
    UPDATE accounts 
    SET saldo = v_new_balance 
    WHERE id = p_account_id;
    
    -- Retornar sucesso
    v_result := jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'old_balance', v_account.saldo,
      'new_balance', v_new_balance,
      'transaction_type', p_tipo,
      'amount', p_valor,
      'message', CASE 
        WHEN p_tipo = 'despesa' THEN 'Despesa registada - dívida aumentou'
        WHEN p_tipo = 'receita' THEN 'Receita registada - dívida diminuiu'
      END
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro ao processar transação de cartão de crédito: ' || SQLERRM
      );
  END;
END;
$$;


ALTER FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_valor" numeric, "p_data" "date", "p_categoria_id" "uuid", "p_tipo" "text", "p_descricao" "text", "p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    return json_build_object('error', 'not_allowed');
  end if;

  v_tipo := case when p_tipo in ('receita','despesa') then p_tipo else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, p_categoria_id, abs(p_valor), coalesce(p_descricao,'Movimento cartão'), p_data, v_tipo)
  returning id into v_tx_id;

  if p_goal_id is not null then
    insert into public.goal_allocations (id, goal_id, account_id, valor)
    values (gen_random_uuid(), p_goal_id, p_account_id, abs(p_valor));
  end if;

  perform public.update_account_balance(p_account_id);
  return json_build_object('transaction_id', v_tx_id);
end;
$$;


ALTER FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_large_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_account_name text;
  v_category_name text;
  v_user_name text;
  v_threshold numeric := 1000; -- Limite de 1000€ para notificação
BEGIN
  SET search_path = public, pg_temp;
  
  -- Só processar se for uma transação familiar e o valor for alto
  IF NEW.family_id IS NOT NULL AND NEW.valor > v_threshold THEN
    -- Obter nome da família
    SELECT nome INTO v_family_name
    FROM families
    WHERE id = NEW.family_id;
    
    -- Obter nome da conta
    SELECT nome INTO v_account_name
    FROM accounts
    WHERE id = NEW.account_id;
    
    -- Obter nome da categoria
    SELECT nome INTO v_category_name
    FROM categories
    WHERE id = NEW.categoria_id;
    
    -- Obter nome do utilizador
    SELECT nome INTO v_user_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      NEW.family_id,
      NEW.user_id,
      'Transação Grande',
      v_user_name || ' fez uma transação de ' || NEW.valor || '€ em ' || v_account_name || ' (' || v_category_name || ')',
      'warning',
      'transaction',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.valor,
        'account_name', v_account_name,
        'category_name', v_category_name,
        'user_name', v_user_name,
        'date', NEW.data
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_large_transaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_large_transaction"() IS 'Trigger que cria notificação para transações grandes (>1000€)';



CREATE OR REPLACE FUNCTION "public"."handle_member_removal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = OLD.family_id;
  
  -- Obter nome do membro
  SELECT nome INTO v_member_name
  FROM profiles
  WHERE user_id = OLD.user_id;
  
  -- Criar notificação
  PERFORM create_family_notification(
    OLD.family_id,
    OLD.user_id,
    'Membro Removido',
    v_member_name || ' foi removido da família ' || v_family_name,
    'warning',
    'member',
    jsonb_build_object(
      'member_id', OLD.user_id,
      'member_name', v_member_name,
      'role', OLD.role
    )
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_member_removal"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_member_removal"() IS 'Trigger que cria notificação quando um membro é removido da família';



CREATE OR REPLACE FUNCTION "public"."handle_member_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Só processar se o papel mudou
  IF OLD.role != NEW.role THEN
    -- Obter nome da família
    SELECT nome INTO v_family_name
    FROM families
    WHERE id = NEW.family_id;
    
    -- Obter nome do membro
    SELECT nome INTO v_member_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      NEW.family_id,
      NEW.user_id,
      'Mudança de Papel',
      v_member_name || ' foi promovido para ' || NEW.role || ' na família ' || v_family_name,
      'info',
      'member',
      jsonb_build_object(
        'member_id', NEW.user_id,
        'member_name', v_member_name,
        'old_role', OLD.role,
        'new_role', NEW.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_member_role_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_member_role_change"() IS 'Trigger que cria notificação quando o papel de um membro é alterado';



CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, updated_at) values (new.id, now())
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_family_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = NEW.family_id;
  
  -- Obter nome do membro
  SELECT nome INTO v_member_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Criar notificação
  PERFORM create_family_notification(
    NEW.family_id,
    NEW.user_id,
    'Novo Membro da Família',
    v_member_name || ' juntou-se à família ' || v_family_name,
    'success',
    'member',
    jsonb_build_object(
      'member_id', NEW.user_id,
      'member_name', v_member_name,
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_family_member"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_family_member"() IS 'Trigger que cria notificação quando um novo membro se junta à família';



CREATE OR REPLACE FUNCTION "public"."handle_new_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_family_name text;
  v_inviter_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = NEW.family_id;
  
  -- Obter nome de quem convidou
  SELECT nome INTO v_inviter_name
  FROM profiles
  WHERE user_id = NEW.invited_by;
  
  -- Criar notificação para o convite
  PERFORM create_family_notification(
    NEW.family_id,
    NEW.invited_by,
    'Novo Convite Enviado',
    v_inviter_name || ' convidou ' || NEW.email || ' para a família ' || v_family_name,
    'info',
    'invite',
    jsonb_build_object(
      'invite_id', NEW.id,
      'invite_email', NEW.email,
      'invite_role', NEW.role,
      'inviter_name', v_inviter_name
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_invite"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_invite"() IS 'Trigger que cria notificação quando um novo convite é enviado';



CREATE OR REPLACE FUNCTION "public"."invite_family_member_by_email"("p_family_id" "uuid", "p_email" "text", "p_role" "text" DEFAULT 'member'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role text;
  v_invite_id uuid;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem convidar membros';
  END IF;

  -- Verificar se já existe um convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM family_invites 
    WHERE family_id = p_family_id AND email = p_email AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este email';
  END IF;

  -- Verificar se o utilizador já é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members fm
    JOIN auth.users au ON fm.user_id = au.id
    WHERE fm.family_id = p_family_id AND au.email = p_email
  ) THEN
    RAISE EXCEPTION 'Utilizador já é membro desta família';
  END IF;

  -- Criar o convite
  INSERT INTO family_invites (family_id, email, role, status, invited_by, expires_at)
  VALUES (p_family_id, p_email, p_role, 'pending', v_user_id, NOW() + INTERVAL '7 days')
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Convite enviado com sucesso',
    'invite_id', v_invite_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em invite_family_member_by_email: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao enviar convite';
END;
$$;


ALTER FUNCTION "public"."invite_family_member_by_email"("p_family_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_result" boolean, "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO debug_logs (operation, table_name, user_id, result, details)
  VALUES (p_operation, p_table_name, auth.uid(), p_result, p_details);
END;
$$;


ALTER FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_result" boolean, "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" boolean, "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Log apenas em ambiente de desenvolvimento
    IF current_setting('app.environment', true) = 'development' THEN
        INSERT INTO public.debug_logs (
            operation,
            table_name,
            user_id,
            result,
            details,
            created_at
        ) VALUES (
            p_operation,
            p_table_name,
            p_user_id,
            p_result,
            p_details,
            NOW()
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar erros de logging para não afetar operações principais
    NULL;
END;
$$;


ALTER FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" boolean, "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" "text", "p_details" json) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  IF current_setting('app.environment', true) = 'development' THEN
      INSERT INTO public.debug_logs (
          operation,
          table_name,
          user_id,
          result,
          details,
          created_at
      ) VALUES (
          p_operation,
          p_table_name,
          p_user_id,
          p_result,
          p_details,
          NOW()
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;


ALTER FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" "text", "p_details" json) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_curr numeric(15,2) := 0;
  v_diff numeric(15,2) := 0;
  v_cat uuid;
  v_tx_id uuid;
  v_is_owner boolean := false;
  v_tipo text;
begin
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    raise exception 'Not allowed';
  end if;

  select saldo_atual into v_curr from public.account_balances where account_id = p_account_id;
  v_diff := coalesce(p_new_balance,0) - coalesce(v_curr,0);
  if v_diff = 0 then return null; end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Ajuste', '#6B7280');
  v_tipo := case when v_diff > 0 then 'receita' else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_account_id, v_cat, abs(v_diff), 'Ajuste de saldo (cartão)', current_date, v_tipo)
  returning id into v_tx_id;

  perform public.update_account_balance(p_account_id);
  return v_tx_id;
end;
$$;


ALTER FUNCTION "public"."manage_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pay_credit_card_from_account"("p_user_id" "uuid", "p_card_account_id" "uuid", "p_bank_account_id" "uuid", "p_amount" numeric, "p_date" "date", "p_descricao" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_is_owner boolean := false;
  v_cat uuid;
  v_desc text := coalesce(p_descricao, 'Pagamento de cartão por transferência');
  v_out uuid;
  v_in uuid;
begin
  if coalesce(p_amount,0) <= 0 then return false; end if;

  -- ownership
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_card_account_id;
  if not v_is_owner then return false; end if;
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner from public.accounts a where a.id = p_bank_account_id;
  if not v_is_owner then return false; end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Transferência', '#3B82F6');

  -- saída da conta bancária
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_bank_account_id, v_cat, p_amount, v_desc, p_date, 'despesa')
  returning id into v_out;

  -- entrada no cartão (reduz dívida)
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (gen_random_uuid(), p_user_id, p_card_account_id, v_cat, p_amount, v_desc, p_date, 'receita')
  returning id into v_in;

  perform public.update_account_balance(p_bank_account_id);
  perform public.update_account_balance(p_card_account_id);
  return true;
end;
$$;


ALTER FUNCTION "public"."pay_credit_card_from_account"("p_user_id" "uuid", "p_card_account_id" "uuid", "p_bank_account_id" "uuid", "p_amount" numeric, "p_date" "date", "p_descricao" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role text;
  v_member_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  -- Verificar se o membro a remover é owner
  SELECT role INTO v_member_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = p_member_user_id;
  
  IF v_member_role = 'owner' THEN
    RAISE EXCEPTION 'Não é possível remover o proprietário da família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover membros';
  END IF;

  -- Remover o membro
  DELETE FROM family_members 
  WHERE family_id = p_family_id AND user_id = p_member_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Membro removido com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em remove_family_member: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao remover membro';
END;
$$;


ALTER FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_backup_record RECORD;
  v_family_id UUID;
  v_backup_data JSONB;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o backup existe e se o utilizador tem permissão
  SELECT fb.*, f.nome as family_name INTO v_backup_record
  FROM family_backups fb
  JOIN families f ON f.id = fb.family_id
  JOIN family_members fm ON fm.family_id = f.id
  WHERE fb.id = p_backup_id 
    AND fm.user_id = v_user_id
    AND fm.role IN ('owner', 'admin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup não encontrado ou não tem permissão para restaurar';
  END IF;

  IF v_backup_record.status != 'completed' THEN
    RAISE EXCEPTION 'Backup não está completo e não pode ser restaurado';
  END IF;

  v_family_id := v_backup_record.family_id;

  -- Em produção, aqui carregaríamos os dados do storage
  -- Por agora, vamos apenas simular a restauração
  
  -- Criar notificação de restauração iniciada
  PERFORM create_family_notification(
    v_family_id,
    v_user_id,
    'Restauração Iniciada',
    'A restauração do backup foi iniciada',
    'info',
    'backup',
    jsonb_build_object(
      'backup_id', p_backup_id,
      'backup_date', v_backup_record.created_at
    )
  );

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'backup_id', p_backup_id,
    'family_id', v_family_id,
    'family_name', v_backup_record.family_name,
    'message', 'Restauração iniciada com sucesso'
  ) INTO v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao restaurar backup: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") IS 'Restaura um backup de uma família';



CREATE OR REPLACE FUNCTION "public"."set_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_category_id UUID;
  v_current_total_expenses NUMERIC := 0;
  v_current_total_payments NUMERIC := 0;
  v_new_total_expenses NUMERIC := 0;
  v_new_total_payments NUMERIC := 0;
  v_adjustment_amount NUMERIC := 0;
  v_current_balance_from_totals NUMERIC := 0;
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

  -- Convert positive values to negative for credit cards
  -- If user enters 300, it should become -300
  IF p_new_balance > 0 THEN
    p_new_balance := -p_new_balance;
  END IF;

  -- Get current totals including adjustments (for calculation purposes)
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
  INTO v_current_total_expenses, v_current_total_payments
  FROM transactions
  WHERE account_id = p_account_id;

  -- Calculate current balance from these totals
  v_current_balance_from_totals := v_current_total_payments - v_current_total_expenses;

  -- If the account's stored saldo is 0, then the current totals for calculation should also be 0
  -- This handles the case where the card was previously zeroed out
  IF v_account.saldo = 0 THEN
    v_current_total_expenses := 0;
    v_current_total_payments := 0;
    v_current_balance_from_totals := 0;
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
    
    -- Clear all adjustment transactions
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';
  ELSE
    -- If new balance is not 0, adjust totals to match the new balance
    -- The goal is: v_new_total_payments - v_new_total_expenses = p_new_balance
    -- Since p_new_balance is negative, we need: v_new_total_expenses - v_new_total_payments = ABS(p_new_balance)
    
    -- Calculate the difference needed
    DECLARE
      v_balance_difference NUMERIC := p_new_balance - v_current_balance_from_totals;
    BEGIN
      IF v_balance_difference < 0 THEN
        -- Need to increase expenses (or decrease payments)
        -- Prefer to increase expenses to create debt
        v_new_total_expenses := v_current_total_expenses + ABS(v_balance_difference);
        v_new_total_payments := v_current_total_payments;
      ELSIF v_balance_difference > 0 THEN
        -- Need to increase payments (or decrease expenses)
        -- Prefer to increase payments to reduce debt
        v_new_total_payments := v_current_total_payments + v_balance_difference;
        v_new_total_expenses := v_current_total_expenses;
      ELSE
        -- No change needed
        v_new_total_expenses := v_current_total_expenses;
        v_new_total_payments := v_current_total_payments;
      END IF;
    END;
    
    -- Clear existing adjustment transactions and create new ones
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';
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
    'balance_difference', p_new_balance - v_current_balance_from_totals
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao atualizar saldo: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."set_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_regular_account_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_curr numeric(15,2) := 0;
  v_diff numeric(15,2) := 0;
  v_cat uuid;
  v_tipo text;
  v_tx_id uuid;
  v_is_owner boolean := false;
begin
  -- validate ownership
  select (a.user_id = p_user_id) or exists (
    select 1 from public.family_members fm where fm.user_id = p_user_id and fm.family_id = a.family_id
  ) into v_is_owner
  from public.accounts a where a.id = p_account_id;
  if not v_is_owner then
    raise exception 'Not allowed';
  end if;

  select saldo_atual into v_curr from public.account_balances where account_id = p_account_id;
  v_diff := coalesce(p_new_balance,0) - coalesce(v_curr,0);

  if v_diff = 0 then
    return null;
  end if;

  v_cat := public.ensure_category_for_user(p_user_id, 'Ajuste', '#6B7280');
  v_tipo := case when v_diff > 0 then 'receita' else 'despesa' end;

  insert into public.transactions (id, user_id, account_id, categoria_id, valor, descricao, data, tipo)
  values (
    gen_random_uuid(), p_user_id, p_account_id, v_cat, abs(v_diff),
    'Ajuste de saldo', current_date, v_tipo
  ) returning id into v_tx_id;

  perform public.update_account_balance(p_account_id);
  return v_tx_id;
end;
$$;


ALTER FUNCTION "public"."set_regular_account_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_user_id_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_auth_context"() RETURNS TABLE("current_user_id" "uuid", "has_auth_context" boolean, "test_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as current_user_id,
    (auth.uid() IS NOT NULL) as has_auth_context,
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 'Auth context is working'
      ELSE 'No auth context - this is normal when called via MCP'
    END as test_message;
END;
$$;


ALTER FUNCTION "public"."test_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_account_balance"("account_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_balance numeric(15,2) := 0;
begin
  select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2)
    into v_balance
  from public.transactions t
  where t.account_id = account_id_param;

  update public.accounts set saldo = v_balance where id = account_id_param;
  return true;
end;
$$;


ALTER FUNCTION "public"."update_account_balance"("account_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_family_settings"("p_family_id" "uuid", "p_nome" "text", "p_description" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  -- Obter o ID do utilizador atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  
  -- Verificar se o utilizador é owner da família
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN json_build_object('success', false, 'message', 'Apenas o dono da família pode alterar estas configurações');
  END IF;
  
  -- Atualizar as configurações da família
  UPDATE families 
  SET 
    nome = p_nome,
    description = p_description,
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_family_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Configurações atualizadas com sucesso',
    'family_id', p_family_id
  );
END;
$$;


ALTER FUNCTION "public"."update_family_settings"("p_family_id" "uuid", "p_nome" "text", "p_description" "text", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_allocations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_goal_allocations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_role"("p_family_id" "uuid", "p_member_user_id" "uuid", "p_new_role" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar roles';
  END IF;

  -- Atualizar o role
  UPDATE family_members 
  SET role = p_new_role
  WHERE family_id = p_family_id AND user_id = p_member_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Role atualizado com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em update_member_role: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao atualizar role';
END;
$$;


ALTER FUNCTION "public"."update_member_role"("p_family_id" "uuid", "p_member_user_id" "uuid", "p_new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_family_permission"("p_family_id" "uuid", "p_required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_user_id uuid;
    v_user_role text;
    v_has_permission boolean := false;
BEGIN
    SET search_path = public, pg_temp;
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    SELECT role INTO v_user_role
    FROM family_members
    WHERE family_id = p_family_id AND user_id = v_user_id;
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;
    CASE p_required_role
        WHEN 'owner' THEN
            v_has_permission := (v_user_role = 'owner');
        WHEN 'admin' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin'));
        WHEN 'member' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin', 'member'));
        WHEN 'viewer' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin', 'member', 'viewer'));
        ELSE
            v_has_permission := false;
    END CASE;
    RETURN v_has_permission;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em validate_family_permission: %', SQLERRM;
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."validate_family_permission"("p_family_id" "uuid", "p_required_role" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "saldo" numeric(15,2) DEFAULT 0.00,
    "family_id" "uuid",
    "billing_cycle_day" integer,
    CONSTRAINT "accounts_billing_cycle_day_check" CHECK ((("billing_cycle_day" >= 1) AND ("billing_cycle_day" <= 31))),
    CONSTRAINT "accounts_tipo_check" CHECK (("tipo" = ANY (ARRAY['corrente'::"text", 'poupança'::"text", 'investimento'::"text", 'outro'::"text", 'cartão de crédito'::"text"])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'Tabela de contas bancárias - RLS ativo para segurança';



COMMENT ON COLUMN "public"."accounts"."saldo" IS 'Saldo atual da conta em euros';



CREATE OR REPLACE VIEW "public"."account_balances" AS
 SELECT "a"."id" AS "account_id",
    "a"."user_id",
    "a"."family_id",
    "a"."nome",
    "a"."tipo",
    (COALESCE("sum"(
        CASE
            WHEN ("t"."tipo" = 'receita'::"text") THEN "t"."valor"
            ELSE (- "t"."valor")
        END), (0)::numeric))::numeric(15,2) AS "saldo_atual"
   FROM ("public"."accounts" "a"
     LEFT JOIN "public"."transactions" "t" ON (("t"."account_id" = "a"."id")))
  GROUP BY "a"."id", "a"."user_id", "a"."family_id", "a"."nome", "a"."tipo";


ALTER VIEW "public"."account_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goal_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "data_alocacao" "date" DEFAULT CURRENT_DATE NOT NULL,
    "descricao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "goal_allocations_valor_check" CHECK (("valor" > (0)::numeric))
);


ALTER TABLE "public"."goal_allocations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."account_balances_v1" WITH ("security_invoker"='true') AS
 WITH "account_transactions" AS (
         SELECT "t"."account_id",
            COALESCE("sum"(
                CASE
                    WHEN ("t"."tipo" = 'receita'::"text") THEN "t"."valor"
                    WHEN ("t"."tipo" = 'despesa'::"text") THEN (- "t"."valor")
                    WHEN ("t"."tipo" = 'transferencia'::"text") THEN (- "t"."valor")
                    ELSE (0)::numeric
                END), (0)::numeric) AS "saldo_atual"
           FROM "public"."transactions" "t"
          GROUP BY "t"."account_id"
        ), "account_reserved" AS (
         SELECT "ga"."account_id",
            COALESCE("sum"("ga"."valor"), (0)::numeric) AS "reservado"
           FROM ("public"."goal_allocations" "ga"
             JOIN "public"."goals" "g" ON (("ga"."goal_id" = "g"."id")))
          WHERE ("g"."ativa" = true)
          GROUP BY "ga"."account_id"
        )
 SELECT "a"."id" AS "account_id",
    "a"."nome",
    "a"."tipo",
    "a"."family_id",
    "a"."user_id",
    COALESCE("at"."saldo_atual", (0)::numeric) AS "saldo_atual",
    COALESCE("ar"."reservado", (0)::numeric) AS "reservado",
        CASE
            WHEN ("a"."tipo" = 'cartão de crédito'::"text") THEN (0)::numeric
            ELSE COALESCE("ar"."reservado", (0)::numeric)
        END AS "reservado_final",
        CASE
            WHEN ("a"."tipo" = 'cartão de crédito'::"text") THEN NULL::numeric
            ELSE GREATEST((COALESCE("at"."saldo_atual", (0)::numeric) - COALESCE("ar"."reservado", (0)::numeric)), (0)::numeric)
        END AS "disponivel",
        CASE
            WHEN ("a"."tipo" = 'cartão de crédito'::"text") THEN (COALESCE("at"."saldo_atual", (0)::numeric) < (0)::numeric)
            ELSE NULL::boolean
        END AS "is_in_debt"
   FROM (("public"."accounts" "a"
     LEFT JOIN "account_transactions" "at" ON (("a"."id" = "at"."account_id")))
     LEFT JOIN "account_reserved" "ar" ON (("a"."id" = "ar"."account_id")));


ALTER VIEW "public"."account_balances_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."account_balances_v1" IS 'View que calcula saldos agregados por conta, resolvendo o problema N+1. Inclui saldo_atual, reservado, disponivel e status de cartões de crédito.';



CREATE OR REPLACE VIEW "public"."account_reserved" AS
 SELECT "a"."id" AS "account_id",
    (COALESCE("sum"("ga"."valor"), (0)::numeric))::numeric(15,2) AS "total_reservado"
   FROM ("public"."accounts" "a"
     LEFT JOIN "public"."goal_allocations" "ga" ON (("ga"."account_id" = "a"."id")))
  GROUP BY "a"."id";


ALTER VIEW "public"."account_reserved" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "operation" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "details" "jsonb",
    "ip_address" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "family_id" "uuid"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."budget_progress" AS
 SELECT "b"."id" AS "budget_id",
    "b"."user_id",
    "b"."categoria_id",
    "c"."nome" AS "categoria_nome",
    "c"."cor" AS "categoria_cor",
    "b"."valor" AS "valor_orcamento",
    "b"."mes",
    COALESCE("sum"(
        CASE
            WHEN ("t"."tipo" = 'despesa'::"text") THEN "t"."valor"
            ELSE (0)::numeric
        END), (0)::numeric) AS "valor_gasto",
    ("b"."valor" - COALESCE("sum"(
        CASE
            WHEN ("t"."tipo" = 'despesa'::"text") THEN "t"."valor"
            ELSE (0)::numeric
        END), (0)::numeric)) AS "valor_restante",
        CASE
            WHEN ("b"."valor" > (0)::numeric) THEN "round"(((COALESCE("sum"(
            CASE
                WHEN ("t"."tipo" = 'despesa'::"text") THEN "t"."valor"
                ELSE (0)::numeric
            END), (0)::numeric) / "b"."valor") * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "progresso_percentual"
   FROM (("public"."budgets" "b"
     LEFT JOIN "public"."categories" "c" ON (("c"."id" = "b"."categoria_id")))
     LEFT JOIN "public"."transactions" "t" ON ((("t"."categoria_id" = "b"."categoria_id") AND ("t"."user_id" = "b"."user_id") AND ("date_trunc"('month'::"text", ("t"."data")::timestamp with time zone) = "date_trunc"('month'::"text", ("to_date"(("b"."mes")::"text", 'YYYY-MM'::"text"))::timestamp with time zone)))))
  GROUP BY "b"."id", "b"."user_id", "b"."categoria_id", "c"."nome", "c"."cor", "b"."valor", "b"."mes";


ALTER VIEW "public"."budget_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debug_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "user_id" "uuid",
    "result" boolean NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."debug_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "settings" "jsonb" DEFAULT '{"allow_view_all": true, "require_approval": false, "allow_add_transactions": true}'::"jsonb"
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "backup_type" "text" DEFAULT 'full'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "file_path" "text",
    "file_size" bigint,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '1 year'::interval),
    CONSTRAINT "family_backups_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "family_backups_type_check" CHECK (("backup_type" = ANY (ARRAY['full'::"text", 'incremental'::"text", 'selective'::"text"])))
);


ALTER TABLE "public"."family_backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "token" character varying(255) DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text"),
    "accepted_at" timestamp with time zone,
    CONSTRAINT "family_invites_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::"text"[]))),
    CONSTRAINT "family_invites_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "family_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "permissions" "text"[] DEFAULT ARRAY['view_transactions'::"text"],
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "family_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::"text"[])))
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "foto_url" "text",
    "percentual_divisao" numeric(5,2) DEFAULT 50.00,
    "poupanca_mensal" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "birth_date" "date",
    "personal_settings" "jsonb" DEFAULT '{"theme": "system", "appearance": {"theme": "system", "compact_mode": false, "show_currency_symbol": true}, "notifications": {"push": true, "email": true, "budget_alerts": true, "goal_reminders": true, "transaction_alerts": false}}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."first_name" IS 'Nome próprio do utilizador';



COMMENT ON COLUMN "public"."profiles"."last_name" IS 'Apelido do utilizador';



COMMENT ON COLUMN "public"."profiles"."phone" IS 'Número de telefone do utilizador';



COMMENT ON COLUMN "public"."profiles"."birth_date" IS 'Data de nascimento do utilizador';



COMMENT ON COLUMN "public"."profiles"."personal_settings" IS 'Configurações pessoais do utilizador (tema, notificações, etc.)';



CREATE OR REPLACE VIEW "public"."family_members_with_profile" WITH ("security_invoker"='true') AS
 SELECT "fm"."id",
    "fm"."user_id",
    "fm"."family_id",
    "fm"."role",
    "fm"."permissions",
    "fm"."joined_at",
    "p"."nome" AS "profile_nome"
   FROM ("public"."family_members" "fm"
     LEFT JOIN "public"."profiles" "p" ON ((("fm"."user_id")::"text" = ("p"."user_id")::"text")));


ALTER VIEW "public"."family_members_with_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixed_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "dia_vencimento" integer NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "ativa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fixed_expenses_dia_vencimento_check" CHECK ((("dia_vencimento" >= 1) AND ("dia_vencimento" <= 31)))
);


ALTER TABLE "public"."fixed_expenses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."goal_progress" AS
 SELECT "g"."id" AS "goal_id",
    "g"."nome",
    "g"."valor_objetivo",
    COALESCE("sum"("ga"."valor"), (0)::numeric) AS "total_alocado",
    "round"(((COALESCE("sum"("ga"."valor"), (0)::numeric) / NULLIF("g"."valor_objetivo", (0)::numeric)) * (100)::numeric), 2) AS "progresso_percentual"
   FROM ("public"."goals" "g"
     LEFT JOIN "public"."goal_allocations" "ga" ON (("ga"."goal_id" = "g"."id")))
  GROUP BY "g"."id", "g"."nome", "g"."valor_objetivo";


ALTER VIEW "public"."goal_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_id" "uuid",
    "category" "text" DEFAULT 'system'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notifications_category_check" CHECK (("category" = ANY (ARRAY['invite'::"text", 'member'::"text", 'transaction'::"text", 'budget'::"text", 'goal'::"text", 'system'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text",
    "auth" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "family_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "date" "date" NOT NULL,
    "data" "text",
    "recurring" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "layout" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "styling" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."report_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "schedule" character varying(20) NOT NULL,
    "time" time without time zone NOT NULL,
    "day_of_week" integer,
    "day_of_month" integer,
    "options" "jsonb" NOT NULL,
    "email" character varying(255) NOT NULL,
    "active" boolean DEFAULT true,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scheduled_exports_day_of_month_check" CHECK ((("day_of_month" >= 1) AND ("day_of_month" <= 31))),
    CONSTRAINT "scheduled_exports_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "scheduled_exports_schedule_check" CHECK ((("schedule")::"text" = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::"text"[])))
);


ALTER TABLE "public"."scheduled_exports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."transactions_detailed" AS
 SELECT "t"."id",
    "t"."user_id",
    "t"."valor",
    "t"."data",
    "t"."tipo",
    "t"."descricao",
    "t"."created_at",
    "t"."family_id",
    "t"."account_id",
    "t"."goal_id",
    "a"."nome" AS "account_nome",
    "a"."tipo" AS "account_tipo",
    "c"."nome" AS "categoria_nome",
    "c"."cor" AS "categoria_cor",
    "g"."nome" AS "goal_nome",
    "f"."nome" AS "family_nome"
   FROM (((("public"."transactions" "t"
     LEFT JOIN "public"."accounts" "a" ON (("t"."account_id" = "a"."id")))
     LEFT JOIN "public"."categories" "c" ON (("t"."categoria_id" = "c"."id")))
     LEFT JOIN "public"."goals" "g" ON (("t"."goal_id" = "g"."id")))
     LEFT JOIN "public"."families" "f" ON (("t"."family_id" = "f"."id")));


ALTER VIEW "public"."transactions_detailed" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_nome_user_id_key" UNIQUE ("nome", "user_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debug_logs"
    ADD CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_backups"
    ADD CONSTRAINT "family_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_family_id_key" UNIQUE ("user_id", "family_id");



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_allocations"
    ADD CONSTRAINT "goal_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_exports"
    ADD CONSTRAINT "scheduled_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "budgets_categoria_id_idx" ON "public"."budgets" USING "btree" ("categoria_id");



CREATE INDEX "budgets_mes_idx" ON "public"."budgets" USING "btree" ("mes");



CREATE INDEX "budgets_user_id_idx" ON "public"."budgets" USING "btree" ("user_id");



CREATE INDEX "budgets_user_mes_idx" ON "public"."budgets" USING "btree" ("user_id", "mes");



CREATE INDEX "idx_accounts_family_id" ON "public"."accounts" USING "btree" ("family_id");



CREATE INDEX "idx_accounts_family_type" ON "public"."accounts" USING "btree" ("family_id", "tipo") WHERE ("family_id" IS NOT NULL);



CREATE INDEX "idx_accounts_user_family_created" ON "public"."accounts" USING "btree" ("user_id", "family_id", "created_at" DESC);



CREATE INDEX "idx_accounts_user_id_family_id" ON "public"."accounts" USING "btree" ("user_id", "family_id");



COMMENT ON INDEX "public"."idx_accounts_user_id_family_id" IS 'Índice para filtrar contas por utilizador e família';



CREATE INDEX "idx_accounts_user_type" ON "public"."accounts" USING "btree" ("user_id", "tipo");



CREATE INDEX "idx_budgets_family_id" ON "public"."budgets" USING "btree" ("family_id");



CREATE INDEX "idx_categories_family_id" ON "public"."categories" USING "btree" ("family_id");



CREATE INDEX "idx_categories_family_type" ON "public"."categories" USING "btree" ("family_id", "nome") WHERE ("family_id" IS NOT NULL);



CREATE INDEX "idx_categories_user_family_created" ON "public"."categories" USING "btree" ("user_id", "family_id", "created_at" DESC);



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "idx_categories_user_type" ON "public"."categories" USING "btree" ("user_id", "nome") WHERE ("family_id" IS NULL);



CREATE INDEX "idx_families_created_by" ON "public"."families" USING "btree" ("created_by");



CREATE INDEX "idx_family_backups_created_at" ON "public"."family_backups" USING "btree" ("created_at");



CREATE INDEX "idx_family_backups_expires_at" ON "public"."family_backups" USING "btree" ("expires_at");



CREATE INDEX "idx_family_backups_family_id" ON "public"."family_backups" USING "btree" ("family_id");



CREATE INDEX "idx_family_backups_status" ON "public"."family_backups" USING "btree" ("status");



CREATE INDEX "idx_family_invites_created_at" ON "public"."family_invites" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_family_invites_email" ON "public"."family_invites" USING "btree" ("email");



CREATE INDEX "idx_family_invites_email_status" ON "public"."family_invites" USING "btree" ("email", "status");



CREATE INDEX "idx_family_invites_family_id" ON "public"."family_invites" USING "btree" ("family_id");



CREATE INDEX "idx_family_invites_invited_by" ON "public"."family_invites" USING "btree" ("invited_by");



CREATE INDEX "idx_family_invites_pending" ON "public"."family_invites" USING "btree" ("family_id", "status", "created_at") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_family_invites_status" ON "public"."family_invites" USING "btree" ("status");



CREATE INDEX "idx_family_invites_token" ON "public"."family_invites" USING "btree" ("token");



CREATE INDEX "idx_family_members_family_id" ON "public"."family_members" USING "btree" ("family_id");



CREATE INDEX "idx_family_members_family_id_user_id" ON "public"."family_members" USING "btree" ("family_id", "user_id");



CREATE INDEX "idx_family_members_family_role" ON "public"."family_members" USING "btree" ("family_id", "role", "joined_at");



CREATE INDEX "idx_family_members_joined_at" ON "public"."family_members" USING "btree" ("joined_at" DESC);



CREATE INDEX "idx_family_members_user_id" ON "public"."family_members" USING "btree" ("user_id");



CREATE INDEX "idx_fixed_expenses_categoria_id" ON "public"."fixed_expenses" USING "btree" ("categoria_id");



CREATE INDEX "idx_fixed_expenses_user_id" ON "public"."fixed_expenses" USING "btree" ("user_id");



CREATE INDEX "idx_goal_allocations_account_id" ON "public"."goal_allocations" USING "btree" ("account_id");



COMMENT ON INDEX "public"."idx_goal_allocations_account_id" IS 'Índice para otimizar agregações de alocações por conta';



CREATE INDEX "idx_goal_allocations_data_alocacao" ON "public"."goal_allocations" USING "btree" ("data_alocacao");



CREATE INDEX "idx_goal_allocations_goal_id" ON "public"."goal_allocations" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_allocations_user_id" ON "public"."goal_allocations" USING "btree" ("user_id");



CREATE INDEX "idx_goals_account_id" ON "public"."goals" USING "btree" ("account_id");



CREATE INDEX "idx_goals_active_status" ON "public"."goals" USING "btree" ("ativa", "status") WHERE (("ativa" = true) AND (("status")::"text" = 'active'::"text"));



COMMENT ON INDEX "public"."idx_goals_active_status" IS 'Índice para filtrar objetivos ativos rapidamente';



CREATE INDEX "idx_goals_family_status" ON "public"."goals" USING "btree" ("family_id", "status", "prazo") WHERE (("family_id" IS NOT NULL) AND ("ativa" = true));



CREATE INDEX "idx_goals_user_id" ON "public"."goals" USING "btree" ("user_id");



CREATE INDEX "idx_goals_user_status" ON "public"."goals" USING "btree" ("user_id", "status", "prazo") WHERE ("ativa" = true);



CREATE INDEX "idx_notifications_category" ON "public"."notifications" USING "btree" ("category");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_family_id" ON "public"."notifications" USING "btree" ("family_id");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_report_templates_created_at" ON "public"."report_templates" USING "btree" ("created_at");



CREATE INDEX "idx_report_templates_user_id" ON "public"."report_templates" USING "btree" ("user_id");



CREATE INDEX "idx_scheduled_exports_active" ON "public"."scheduled_exports" USING "btree" ("active");



CREATE INDEX "idx_scheduled_exports_next_run" ON "public"."scheduled_exports" USING "btree" ("next_run");



CREATE INDEX "idx_scheduled_exports_user_id" ON "public"."scheduled_exports" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_account_date" ON "public"."transactions" USING "btree" ("account_id", "data" DESC);



CREATE INDEX "idx_transactions_account_id" ON "public"."transactions" USING "btree" ("account_id");



CREATE INDEX "idx_transactions_account_id_tipo_valor" ON "public"."transactions" USING "btree" ("account_id", "tipo", "valor");



CREATE INDEX "idx_transactions_account_type" ON "public"."transactions" USING "btree" ("account_id", "tipo") WHERE ("account_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_transactions_account_type" IS 'Índice para otimizar cálculos de saldo por conta e tipo de transação';



CREATE INDEX "idx_transactions_categoria_id" ON "public"."transactions" USING "btree" ("categoria_id");



CREATE INDEX "idx_transactions_category_date" ON "public"."transactions" USING "btree" ("categoria_id", "data" DESC);



CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_transactions_family_date" ON "public"."transactions" USING "btree" ("family_id", "data" DESC);



CREATE INDEX "idx_transactions_family_date_created" ON "public"."transactions" USING "btree" ("family_id", "data" DESC, "created_at" DESC) WHERE ("family_id" IS NOT NULL);



CREATE INDEX "idx_transactions_family_id" ON "public"."transactions" USING "btree" ("family_id");



CREATE INDEX "idx_transactions_goal_id" ON "public"."transactions" USING "btree" ("goal_id");



CREATE INDEX "idx_transactions_recent" ON "public"."transactions" USING "btree" ("user_id", "data" DESC, "valor");



CREATE INDEX "idx_transactions_type_date" ON "public"."transactions" USING "btree" ("tipo", "data" DESC);



CREATE INDEX "idx_transactions_user_date" ON "public"."transactions" USING "btree" ("user_id", "data" DESC);



CREATE INDEX "idx_transactions_user_date_created" ON "public"."transactions" USING "btree" ("user_id", "data" DESC, "created_at" DESC) WHERE ("family_id" IS NULL);



CREATE INDEX "idx_transactions_user_date_type" ON "public"."transactions" USING "btree" ("user_id", "data" DESC, "tipo");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_user_monthly" ON "public"."transactions" USING "btree" ("user_id", "data", "tipo", "valor") WHERE ("family_id" IS NULL);



CREATE UNIQUE INDEX "profiles_user_id_unique" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "reminders_date_idx" ON "public"."reminders" USING "btree" ("date");



CREATE INDEX "reminders_user_id_idx" ON "public"."reminders" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "ensure_transaction_family_id_trigger" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_transaction_family_id"();



CREATE OR REPLACE TRIGGER "set_user_id_accounts" BEFORE INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_budgets" BEFORE INSERT ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_categories" BEFORE INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_fixed_expenses" BEFORE INSERT ON "public"."fixed_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_goal_allocations" BEFORE INSERT ON "public"."goal_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_goals" BEFORE INSERT ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_notifications" BEFORE INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_report_templates" BEFORE INSERT ON "public"."report_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_scheduled_exports" BEFORE INSERT ON "public"."scheduled_exports" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_user_id_transactions" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id_from_auth"();



CREATE OR REPLACE TRIGGER "trigger_budget_exceeded" AFTER INSERT OR UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_budget_exceeded"();



CREATE OR REPLACE TRIGGER "trigger_check_credit_card_balance" AFTER INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."check_credit_card_balance"();



CREATE OR REPLACE TRIGGER "trigger_large_transaction" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_large_transaction"();



CREATE OR REPLACE TRIGGER "trigger_member_removal" AFTER DELETE ON "public"."family_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_member_removal"();



CREATE OR REPLACE TRIGGER "trigger_member_role_change" AFTER UPDATE ON "public"."family_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_member_role_change"();



CREATE OR REPLACE TRIGGER "trigger_new_family_member" AFTER INSERT ON "public"."family_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_family_member"();



CREATE OR REPLACE TRIGGER "trigger_new_invite" AFTER INSERT ON "public"."family_invites" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_invite"();



CREATE OR REPLACE TRIGGER "update_goal_allocations_updated_at_trigger" BEFORE UPDATE ON "public"."goal_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_allocations_updated_at"();



CREATE OR REPLACE TRIGGER "update_goals_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_report_templates_updated_at" BEFORE UPDATE ON "public"."report_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_exports_updated_at" BEFORE UPDATE ON "public"."scheduled_exports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_backups"
    ADD CONSTRAINT "family_backups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."family_backups"
    ADD CONSTRAINT "family_backups_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_invites"
    ADD CONSTRAINT "family_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "fk_family_members_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."goal_allocations"
    ADD CONSTRAINT "goal_allocations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_allocations"
    ADD CONSTRAINT "goal_allocations_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_allocations"
    ADD CONSTRAINT "goal_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_exports"
    ADD CONSTRAINT "scheduled_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL;



CREATE POLICY "Users can delete their own report templates" ON "public"."report_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own scheduled exports" ON "public"."scheduled_exports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own report templates" ON "public"."report_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own scheduled exports" ON "public"."scheduled_exports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own report templates" ON "public"."report_templates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own scheduled exports" ON "public"."scheduled_exports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own report templates" ON "public"."report_templates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own scheduled exports" ON "public"."scheduled_exports" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_delete_family" ON "public"."accounts" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."user_id" = "auth"."uid"())))));



CREATE POLICY "accounts_delete_own" ON "public"."accounts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "accounts_delete_policy" ON "public"."accounts" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "accounts_insert_family" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."user_id" = "auth"."uid"())))));



CREATE POLICY "accounts_insert_own" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "accounts_insert_policy" ON "public"."accounts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "accounts_select_family" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."user_id" = "auth"."uid"())))));



CREATE POLICY "accounts_select_own" ON "public"."accounts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "accounts_select_policy" ON "public"."accounts" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND ("fm"."family_id" = "accounts"."family_id")))))));



CREATE POLICY "accounts_update_family" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."user_id" = "auth"."uid"())))));



CREATE POLICY "accounts_update_own" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "accounts_update_policy" ON "public"."accounts" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_delete_simple" ON "public"."audit_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_logs_insert_simple" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "audit_logs_select_admins" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members"
  WHERE (("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "audit_logs_update_simple" ON "public"."audit_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budgets_delete_own" ON "public"."budgets" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_insert_own" ON "public"."budgets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_select_own" ON "public"."budgets" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_update_own" ON "public"."budgets" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_crud_policy" ON "public"."categories" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "categories_delete_user" ON "public"."categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "categories_insert_user" ON "public"."categories" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (("user_id" IS NULL) AND ("family_id" IS NULL))));



CREATE POLICY "categories_select_policy" ON "public"."categories" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND ("fm"."family_id" = "categories"."family_id")))))));



CREATE POLICY "categories_select_public" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "categories_update_user" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."debug_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "debug_logs_deny_all" ON "public"."debug_logs" AS RESTRICTIVE USING (false);



CREATE POLICY "debug_logs_dev_access" ON "public"."debug_logs" TO "authenticated" USING (("current_setting"('app.environment'::"text", true) = 'development'::"text"));



CREATE POLICY "families_select_authenticated" ON "public"."families" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."family_backups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "family_backups_delete_policy" ON "public"."family_backups" FOR DELETE TO "authenticated" USING (("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND (("fm"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "family_backups_insert_policy" ON "public"."family_backups" FOR INSERT TO "authenticated" WITH CHECK (("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND (("fm"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "family_backups_select_policy" ON "public"."family_backups" FOR SELECT TO "authenticated" USING (("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE ("fm"."user_id" = "auth"."uid"()))));



CREATE POLICY "family_backups_update_policy" ON "public"."family_backups" FOR UPDATE TO "authenticated" USING (("family_id" IN ( SELECT "fm"."family_id"
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND (("fm"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "family_invites_select_authenticated" ON "public"."family_invites" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("family_id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "family_members_select_authenticated" ON "public"."family_members" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("family_id" IN ( SELECT "family_members_1"."family_id"
   FROM "public"."family_members" "family_members_1"
  WHERE ("family_members_1"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."fixed_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fixed_expenses_delete_own" ON "public"."fixed_expenses" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "fixed_expenses_insert_own" ON "public"."fixed_expenses" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "fixed_expenses_select_own" ON "public"."fixed_expenses" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "fixed_expenses_update_own" ON "public"."fixed_expenses" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."goal_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goal_allocations_delete_own" ON "public"."goal_allocations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "goal_allocations_insert_own" ON "public"."goal_allocations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "goal_allocations_select_own" ON "public"."goal_allocations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "goal_allocations_update_own" ON "public"."goal_allocations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goals_delete_simple" ON "public"."goals" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "goals_insert_family" ON "public"."goals" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "public"."get_user_families"("auth"."uid"()) AS "get_user_families")))));



CREATE POLICY "goals_insert_simple" ON "public"."goals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "goals_select_simple" ON "public"."goals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "goals_update_simple" ON "public"."goals" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE (("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])))))));



CREATE POLICY "notifications_delete_policy" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE (("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])))))));



CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE ("family_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "family_members"."family_id"
   FROM "public"."family_members"
  WHERE (("family_members"."user_id" = "auth"."uid"()) AND (("family_members"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])))))));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_subscriptions_delete_own" ON "public"."push_subscriptions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push_subscriptions_insert_own" ON "public"."push_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "push_subscriptions_select_own" ON "public"."push_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reminders_delete_own" ON "public"."reminders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "reminders_insert_own" ON "public"."reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "reminders_select_own" ON "public"."reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "reminders_update_own" ON "public"."reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."report_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_delete_policy" ON "public"."transactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_delete_simple" ON "public"."transactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "transactions_insert_policy" ON "public"."transactions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "transactions"."account_id") AND (("a"."user_id" = "auth"."uid"()) OR (("a"."family_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."family_members" "fm"
          WHERE (("fm"."user_id" = "auth"."uid"()) AND ("fm"."family_id" = "a"."family_id")))))))))));



CREATE POLICY "transactions_insert_simple" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "transactions_select_policy" ON "public"."transactions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("family_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."user_id" = "auth"."uid"()) AND ("fm"."family_id" = "transactions"."family_id")))))));



CREATE POLICY "transactions_select_simple" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "transactions_update_policy" ON "public"."transactions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_update_simple" ON "public"."transactions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_family_invite"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_family_invite_by_email"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_family_invite_by_email"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_family_invite_by_email"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."allocate_to_goal_with_transaction"("goal_id_param" "uuid", "account_id_param" "uuid", "amount_param" numeric, "user_id_param" "uuid", "description_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."allocate_to_goal_with_transaction"("goal_id_param" "uuid", "account_id_param" "uuid", "amount_param" numeric, "user_id_param" "uuid", "description_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."allocate_to_goal_with_transaction"("goal_id_param" "uuid", "account_id_param" "uuid", "amount_param" numeric, "user_id_param" "uuid", "description_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_family_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_family_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_family_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_credit_card_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_credit_card_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_credit_card_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_all_old_transfer_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_all_old_transfer_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_old_transfer_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_backups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_transfer_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_transfer_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_transfer_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_unused_indexes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_unused_indexes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_unused_indexes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_backup"("p_family_id" "uuid", "p_backup_type" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_direct"("p_family_name" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_direct"("p_family_name" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_direct"("p_family_name" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_category" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_category" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_notification"("p_family_id" "uuid", "p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_category" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_description" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_user_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_user_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_family_with_member"("p_family_name" "text", "p_user_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_regular_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_regular_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_regular_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transfer_transaction"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount" numeric, "p_user_id" "uuid", "p_categoria_id" "uuid", "p_description" "text", "p_data" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_account_with_related_data"("p_account_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_account_with_related_data"("p_account_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_account_with_related_data"("p_account_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_family_with_cascade"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_goal_with_restoration"("goal_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_goal_with_restoration"("goal_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_goal_with_restoration"("goal_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_category_for_user"("p_user_id" "uuid", "p_name" "text", "p_color" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_category_for_user"("p_user_id" "uuid", "p_name" "text", "p_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_category_for_user"("p_user_id" "uuid", "p_name" "text", "p_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_transaction_family_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_transaction_family_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_transaction_family_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accounts_with_balances"("p_scope" "text", "p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balances"("p_scope" "text", "p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balances"("p_scope" "text", "p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_user_id" "uuid", "p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_user_id" "uuid", "p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_credit_card_summary"("p_user_id" "uuid", "p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_accounts_with_balances"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_accounts_with_balances"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_accounts_with_balances"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_backup_stats"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_budgets"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_budgets"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_budgets"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_data_by_id"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_data_by_id"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_data_by_id"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_goals"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_goals"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_goals"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_kpis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_kpis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_kpis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_kpis_with_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_kpis_with_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_kpis_with_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_members_simple"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_members_simple"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_members_simple"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_members_test"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_members_test"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_members_test"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_members_with_profiles"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_members_with_profiles"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_members_with_profiles"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_pending_invites"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_pending_invites"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_pending_invites"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_statistics"("p_family_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_statistics"("p_family_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_statistics"("p_family_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_family_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_family_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_index_usage_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_index_usage_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_index_usage_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_accounts_with_balances"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_accounts_with_balances"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_accounts_with_balances"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_budgets"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_budgets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_budgets"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_goals"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_goals"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_goals"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_kpis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_kpis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_kpis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_kpis_debug"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_debug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_debug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_kpis_test"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_test"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_test"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_kpis_test_fixed"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_test_fixed"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_test_fixed"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_kpis_with_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_with_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_kpis_with_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personal_transactions_fast"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_personal_transactions_fast"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personal_transactions_fast"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_account_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_account_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_account_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_account_reserved"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_account_reserved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_account_reserved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accounts_with_balances"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_all_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_all_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_all_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_all_transactions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_all_transactions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_all_transactions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_budget_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_budget_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_budget_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_families"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_families"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_families"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_families"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_families"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_families"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_family_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_family_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_family_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_family_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_family_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_family_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_financial_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_financial_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_financial_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_goal_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_goal_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_goal_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_pending_family_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pending_family_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pending_family_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_transactions_detailed"("p_limit" integer, "p_offset" integer, "p_account_id" "uuid", "p_categoria_id" "uuid", "p_tipo" "text", "p_data_inicio" "date", "p_data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_transactions_detailed"("p_limit" integer, "p_offset" integer, "p_account_id" "uuid", "p_categoria_id" "uuid", "p_tipo" "text", "p_data_inicio" "date", "p_data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_transactions_detailed"("p_limit" integer, "p_offset" integer, "p_account_id" "uuid", "p_categoria_id" "uuid", "p_tipo" "text", "p_data_inicio" "date", "p_data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_budget_exceeded"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_budget_exceeded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_budget_exceeded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_credit_card_account"("p_account_id" "uuid", "p_user_id" "uuid", "p_operation" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_credit_card_account"("p_account_id" "uuid", "p_user_id" "uuid", "p_operation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_credit_card_account"("p_account_id" "uuid", "p_user_id" "uuid", "p_operation" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_valor" numeric, "p_data" "date", "p_categoria_id" "uuid", "p_tipo" "text", "p_descricao" "text", "p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_valor" numeric, "p_data" "date", "p_categoria_id" "uuid", "p_tipo" "text", "p_descricao" "text", "p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_valor" numeric, "p_data" "date", "p_categoria_id" "uuid", "p_tipo" "text", "p_descricao" "text", "p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_credit_card_transaction"("p_user_id" "uuid", "p_account_id" "uuid", "p_categoria_id" "uuid", "p_valor" numeric, "p_descricao" "text", "p_data" "date", "p_tipo" "text", "p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_large_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_large_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_large_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_member_removal"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_member_removal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_member_removal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_member_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_member_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_member_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_family_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_family_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_family_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_family_member_by_email"("p_family_id" "uuid", "p_email" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_family_member_by_email"("p_family_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_family_member_by_email"("p_family_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_result" boolean, "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_result" boolean, "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_result" boolean, "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" boolean, "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" boolean, "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" boolean, "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" "text", "p_details" json) TO "anon";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" "text", "p_details" json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_permission_check"("p_operation" "text", "p_table_name" "text", "p_user_id" "uuid", "p_result" "text", "p_details" json) TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."manage_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."pay_credit_card_from_account"("p_user_id" "uuid", "p_card_account_id" "uuid", "p_bank_account_id" "uuid", "p_amount" numeric, "p_date" "date", "p_descricao" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pay_credit_card_from_account"("p_user_id" "uuid", "p_card_account_id" "uuid", "p_bank_account_id" "uuid", "p_amount" numeric, "p_date" "date", "p_descricao" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pay_credit_card_from_account"("p_user_id" "uuid", "p_card_account_id" "uuid", "p_bank_account_id" "uuid", "p_amount" numeric, "p_date" "date", "p_descricao" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_family_member"("p_family_id" "uuid", "p_member_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_family_backup"("p_backup_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."set_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_credit_card_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_regular_account_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."set_regular_account_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_regular_account_balance"("p_user_id" "uuid", "p_account_id" "uuid", "p_new_balance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_auth_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_account_balance"("account_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_account_balance"("account_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_account_balance"("account_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_family_settings"("p_family_id" "uuid", "p_nome" "text", "p_description" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_family_settings"("p_family_id" "uuid", "p_nome" "text", "p_description" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_family_settings"("p_family_id" "uuid", "p_nome" "text", "p_description" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_goal_allocations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_goal_allocations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_allocations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_role"("p_family_id" "uuid", "p_member_user_id" "uuid", "p_new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_role"("p_family_id" "uuid", "p_member_user_id" "uuid", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_role"("p_family_id" "uuid", "p_member_user_id" "uuid", "p_new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_family_permission"("p_family_id" "uuid", "p_required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_family_permission"("p_family_id" "uuid", "p_required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_family_permission"("p_family_id" "uuid", "p_required_role" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."account_balances" TO "anon";
GRANT ALL ON TABLE "public"."account_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."account_balances" TO "service_role";



GRANT ALL ON TABLE "public"."goal_allocations" TO "anon";
GRANT ALL ON TABLE "public"."goal_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."account_balances_v1" TO "anon";
GRANT ALL ON TABLE "public"."account_balances_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."account_balances_v1" TO "service_role";



GRANT ALL ON TABLE "public"."account_reserved" TO "anon";
GRANT ALL ON TABLE "public"."account_reserved" TO "authenticated";
GRANT ALL ON TABLE "public"."account_reserved" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."budget_progress" TO "anon";
GRANT ALL ON TABLE "public"."budget_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_progress" TO "service_role";



GRANT ALL ON TABLE "public"."debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_logs" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."family_backups" TO "anon";
GRANT ALL ON TABLE "public"."family_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."family_backups" TO "service_role";



GRANT ALL ON TABLE "public"."family_invites" TO "anon";
GRANT ALL ON TABLE "public"."family_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."family_invites" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."family_members_with_profile" TO "anon";
GRANT ALL ON TABLE "public"."family_members_with_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members_with_profile" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_expenses" TO "anon";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."goal_progress" TO "anon";
GRANT ALL ON TABLE "public"."goal_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_progress" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."report_templates" TO "anon";
GRANT ALL ON TABLE "public"."report_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."report_templates" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_exports" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_exports" TO "service_role";



GRANT ALL ON TABLE "public"."transactions_detailed" TO "anon";
GRANT ALL ON TABLE "public"."transactions_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions_detailed" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
