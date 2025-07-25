-- MIGRAÇÃO: Corrigir search_path em todas as funções PL/pgSQL

-- 1. accept_family_invite_by_email (p_invite_id uuid)
DROP FUNCTION IF EXISTS public.accept_family_invite_by_email(uuid);
CREATE OR REPLACE FUNCTION public.accept_family_invite_by_email(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_family_id uuid;
  v_role text;
  v_invite_status text;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email não encontrado');
  END IF;
  SELECT family_id, role, status INTO v_family_id, v_role, v_invite_status
  FROM family_invites
  WHERE id = p_invite_id AND email = v_user_email;
  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Convite não encontrado para este email');
  END IF;
  IF v_invite_status IS DISTINCT FROM 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Convite já foi aceite ou não está pendente');
  END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = v_family_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Já é membro desta família');
  END IF;
  INSERT INTO family_members (id, family_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), v_family_id, v_user_id, v_role, NOW());
  UPDATE family_invites SET status = 'accepted', accepted_at = NOW() WHERE id = p_invite_id;
  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso', 'family_id', v_family_id);
END;
$function$;

-- 2. accept_family_invite_by_email (p_email text, p_user_id uuid)
DROP FUNCTION IF EXISTS public.accept_family_invite_by_email(text, uuid);
CREATE OR REPLACE FUNCTION public.accept_family_invite_by_email(p_email text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_invite_record family_invites%ROWTYPE;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  SELECT * INTO v_invite_record
  FROM family_invites
  WHERE email = LOWER(p_email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Convite não encontrado ou expirado');
  END IF;
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = v_invite_record.family_id
    AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Já é membro desta família');
  END IF;
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_invite_record.family_id, v_invite_record.role, ARRAY['view']);
  UPDATE family_invites
  SET status = 'accepted'
  WHERE id = v_invite_record.id;
  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso');
END;
$function$;

-- 3. get_user_pending_family_invites
DROP FUNCTION IF EXISTS public.get_user_pending_family_invites();
CREATE OR REPLACE FUNCTION public.get_user_pending_family_invites()
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email não encontrado');
  END IF;
  SELECT json_build_object(
    'success', true,
    'invites', COALESCE(json_agg(
      json_build_object(
        'id', fi.id,
        'family_id', fi.family_id,
        'family_nome', f.nome,
        'role', fi.role,
        'created_at', fi.created_at,
        'expires_at', fi.expires_at,
        'invited_by_name', COALESCE(p.nome, 'Utilizador')
      ) ORDER BY fi.created_at DESC
    ), '[]'::json)
  ) INTO v_result
  FROM family_invites fi
  LEFT JOIN families f ON fi.family_id = f.id
  LEFT JOIN profiles p ON fi.invited_by = p.user_id
  WHERE fi.email = v_user_email
    AND fi.status = 'pending'
    AND fi.expires_at > NOW();
  RETURN v_result;
END;
$function$;

-- 4. validate_family_permission
DROP FUNCTION IF EXISTS public.validate_family_permission(uuid, text);
CREATE OR REPLACE FUNCTION public.validate_family_permission(p_family_id uuid, p_required_role text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 5. log_permission_check
DROP FUNCTION IF EXISTS public.log_permission_check(text, text, uuid, text, json);
CREATE OR REPLACE FUNCTION public.log_permission_check(
  p_operation text,
  p_table_name text,
  p_user_id uuid,
  p_result text,
  p_details json
)
RETURNS void
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 6. test_user_access
DROP FUNCTION IF EXISTS public.test_user_access(uuid);
CREATE OR REPLACE FUNCTION public.test_user_access(test_user_id uuid)
RETURNS TABLE(entity text, has_record boolean, count integer)
LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  RETURN QUERY
  SELECT 'profiles'::TEXT, 
         EXISTS(SELECT 1 FROM profiles WHERE user_id = test_user_id) AS has_record,
         (SELECT COUNT(*) FROM profiles WHERE user_id = test_user_id);
  RETURN QUERY
  SELECT 'transactions'::TEXT,
         EXISTS(SELECT 1 FROM transactions WHERE user_id = test_user_id) AS has_record,
         (SELECT COUNT(*) FROM transactions WHERE user_id = test_user_id);
  RETURN QUERY
  SELECT 'goals'::TEXT,
         EXISTS(SELECT 1 FROM goals WHERE user_id = test_user_id) AS has_record,
         (SELECT COUNT(*) FROM goals WHERE user_id = test_user_id);
  RETURN QUERY
  SELECT 'categories'::TEXT,
         EXISTS(SELECT 1 FROM categories) AS has_record,
         (SELECT COUNT(*) FROM categories);
END;
$function$;

-- 7. get_user_families
-- Remover políticas dependentes
DROP POLICY IF EXISTS families_member_access ON families;
DROP POLICY IF EXISTS family_members_view ON family_members;
DROP POLICY IF EXISTS transactions_all_access ON transactions;
DROP POLICY IF EXISTS goals_all_access ON goals;

DROP FUNCTION IF EXISTS public.get_user_families(uuid);
CREATE OR REPLACE FUNCTION public.get_user_families(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  RETURN QUERY
  SELECT family_id
  FROM family_members
  WHERE user_id = p_user_id;
END;
$function$;

-- Recriar policies dependentes
CREATE POLICY families_member_access ON families
  FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND (id IN (SELECT get_user_families(auth.uid()) AS get_user_families)));

CREATE POLICY family_members_view ON family_members
  FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND (family_id IN (SELECT get_user_families(auth.uid()) AS get_user_families)));

CREATE POLICY transactions_all_access ON transactions
  USING ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()) AS get_user_families))))
  WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()) AS get_user_families))));

CREATE POLICY goals_all_access ON goals
  USING ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()) AS get_user_families))))
  WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()) AS get_user_families))));

-- 8. get_user_family_data
DROP FUNCTION IF EXISTS public.get_user_family_data(uuid);
CREATE OR REPLACE FUNCTION public.get_user_family_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 9. test_family_data_access
DROP FUNCTION IF EXISTS public.test_family_data_access(uuid);
CREATE OR REPLACE FUNCTION public.test_family_data_access(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_family_id uuid;
    v_transaction_count integer;
    v_goal_count integer;
    v_member_count integer;
BEGIN
    SET search_path = public, pg_temp;
    SELECT fm.family_id INTO v_family_id
    FROM family_members fm
    WHERE fm.user_id = p_user_id
    LIMIT 1;
    IF v_family_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Utilizador não tem família'
        );
    END IF;
    SELECT COUNT(*) INTO v_transaction_count
    FROM transactions
    WHERE family_id = v_family_id;
    SELECT COUNT(*) INTO v_goal_count
    FROM goals
    WHERE family_id = v_family_id;
    SELECT COUNT(*) INTO v_member_count
    FROM family_members
    WHERE family_id = v_family_id;
    RETURN json_build_object(
        'success', true,
        'family_id', v_family_id,
        'summary', json_build_object(
            'transaction_count', v_transaction_count,
            'goal_count', v_goal_count,
            'member_count', v_member_count
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Erro ao aceder aos dados da família',
        'error', SQLERRM
    );
END;
$function$;

-- 10. test_rls_policies_comprehensive
DROP FUNCTION IF EXISTS public.test_rls_policies_comprehensive(uuid);
CREATE OR REPLACE FUNCTION public.test_rls_policies_comprehensive(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result json;
    v_family_id uuid;
    v_family_data json;
    v_transactions json;
    v_goals json;
    v_members json;
    v_invites json;
BEGIN
    SET search_path = public, pg_temp;
    SELECT get_user_family_data(p_user_id) INTO v_family_data;
    SELECT fm.family_id INTO v_family_id
    FROM family_members fm
    WHERE fm.user_id = p_user_id
    LIMIT 1;
    IF v_family_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Utilizador não tem família'
        );
    END IF;
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'valor', t.valor,
            'tipo', t.tipo,
            'data', t.data,
            'descricao', t.descricao
        )
    ) INTO v_transactions
    FROM transactions t
    WHERE t.family_id = v_family_id
    LIMIT 10;
    SELECT json_agg(
        json_build_object(
            'id', g.id,
            'nome', g.nome,
            'valor_objetivo', g.valor_objetivo,
            'valor_atual', g.valor_atual,
            'status', g.status
        )
    ) INTO v_goals
    FROM goals g
    WHERE g.family_id = v_family_id;
    SELECT json_agg(
        json_build_object(
            'id', fm.id,
            'user_id', fm.user_id,
            'role', fm.role,
            'joined_at', fm.joined_at
        )
    ) INTO v_members
    FROM family_members fm
    WHERE fm.family_id = v_family_id;
    SELECT json_agg(
        json_build_object(
            'id', fi.id,
            'email', fi.email,
            'role', fi.role,
            'status', fi.status,
            'created_at', fi.created_at
        )
    ) INTO v_invites
    FROM family_invites fi
    WHERE fi.family_id = v_family_id;
    RETURN json_build_object(
        'success', true,
        'family_data', v_family_data,
        'family_id', v_family_id,
        'access_test', json_build_object(
            'transactions', COALESCE(v_transactions, '[]'::json),
            'goals', COALESCE(v_goals, '[]'::json),
            'members', COALESCE(v_members, '[]'::json),
            'invites', COALESCE(v_invites, '[]'::json)
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Erro ao testar políticas RLS',
        'error', SQLERRM
    );
END;
$function$;

-- 11. trigger_set_timestamp
DROP FUNCTION IF EXISTS public.trigger_set_timestamp();
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 12. update_updated_at_column
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 13. accept_family_invite
DROP FUNCTION IF EXISTS public.accept_family_invite(text);
CREATE OR REPLACE FUNCTION public.accept_family_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 14. create_family_with_member
DROP FUNCTION IF EXISTS public.create_family_with_member(text, text, uuid);
CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_description text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 15. get_family_members_with_profiles
DROP FUNCTION IF EXISTS public.get_family_members_with_profiles(uuid);
CREATE OR REPLACE FUNCTION public.get_family_members_with_profiles(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_build_object(
    'success', true,
    'members', json_agg(
      json_build_object(
        'id', fm.id,
        'user_id', fm.user_id,
        'role', fm.role,
        'permissions', fm.permissions,
        'joined_at', fm.joined_at,
        'profile', json_build_object(
          'nome', COALESCE(p.nome, 'Utilizador'),
          'email', COALESCE(au.email, '')
        )
      ) ORDER BY 
        CASE fm.role 
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          WHEN 'viewer' THEN 4
          ELSE 5
        END,
        fm.joined_at
    )
  ) INTO v_result
  FROM family_members fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id
  WHERE fm.family_id = p_family_id;
  RETURN COALESCE(v_result, json_build_object('success', true, 'members', '[]'::json));
END;
$function$;

-- 16. create_family_direct
DROP FUNCTION IF EXISTS public.create_family_direct(text, uuid);
CREATE OR REPLACE FUNCTION public.create_family_direct(p_family_name text, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 17. invite_family_member_by_email
DROP FUNCTION IF EXISTS public.invite_family_member_by_email(uuid, text, text);
CREATE OR REPLACE FUNCTION public.invite_family_member_by_email(p_family_id uuid, p_email text, p_role text)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
  v_existing_user_id uuid;
  v_existing_invite_id uuid;
  v_new_invite_id uuid;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RETURN json_build_object('success', false, 'message', 'Apenas o dono da família pode convidar membros');
  END IF;
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = p_email;
  IF v_existing_user_id IS NOT NULL THEN
    IF EXISTS(
      SELECT 1 FROM family_members 
      WHERE family_id = p_family_id 
      AND user_id = v_existing_user_id
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Este utilizador já é membro da família');
    END IF;
  END IF;
  SELECT id INTO v_existing_invite_id
  FROM family_invites
  WHERE family_id = p_family_id 
  AND email = p_email 
  AND status = 'pending';
  IF v_existing_invite_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Já existe um convite pendente para este email');
  END IF;
  IF p_role NOT IN ('admin', 'member', 'viewer') THEN
    RETURN json_build_object('success', false, 'message', 'Papel inválido');
  END IF;
  INSERT INTO family_invites (
    id,
    family_id,
    invited_by,
    email,
    role,
    status,
    created_at,
    expires_at
  ) VALUES (
    gen_random_uuid(),
    p_family_id,
    v_user_id,
    p_email,
    p_role,
    'pending',
    NOW(),
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO v_new_invite_id;
  RETURN json_build_object(
    'success', true, 
    'message', 'Convite enviado com sucesso',
    'invite_id', v_new_invite_id
  );
END;
$function$;

-- 18. get_family_pending_invites
DROP FUNCTION IF EXISTS public.get_family_pending_invites(uuid);
CREATE OR REPLACE FUNCTION public.get_family_pending_invites(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id
  ) INTO v_is_member;
  IF NOT v_is_member THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão para ver os convites desta família');
  END IF;
  SELECT json_build_object(
    'success', true,
    'invites', COALESCE(json_agg(
      json_build_object(
        'id', fi.id,
        'email', fi.email,
        'role', fi.role,
        'created_at', fi.created_at,
        'expires_at', fi.expires_at,
        'invited_by_name', COALESCE(p.nome, 'Utilizador')
      ) ORDER BY fi.created_at DESC
    ), '[]'::json)
  ) INTO v_result
  FROM family_invites fi
  LEFT JOIN profiles p ON fi.invited_by = p.user_id
  WHERE fi.family_id = p_family_id 
  AND fi.status = 'pending'
  AND fi.expires_at > NOW();
  RETURN v_result;
END;
$function$;

-- 19. cancel_family_invite
DROP FUNCTION IF EXISTS public.cancel_family_invite(uuid);
CREATE OR REPLACE FUNCTION public.cancel_family_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_family_id uuid;
  v_is_owner boolean;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT family_id INTO v_family_id
  FROM family_invites
  WHERE id = p_invite_id AND status = 'pending';
  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Convite não encontrado');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = v_family_id 
    AND user_id = v_user_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RETURN json_build_object('success', false, 'message', 'Apenas o dono da família pode cancelar convites');
  END IF;
  UPDATE family_invites
  SET status = 'cancelled'
  WHERE id = p_invite_id;
  RETURN json_build_object(
    'success', true, 
    'message', 'Convite cancelado com sucesso'
  );
END;
$function$;

-- 20. get_user_all_transactions
DROP FUNCTION IF EXISTS public.get_user_all_transactions(uuid);
CREATE OR REPLACE FUNCTION public.get_user_all_transactions(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    valor numeric,
    tipo text,
    data date,
    descricao text,
    modo text,
    user_id uuid,
    family_id uuid,
    categoria_id uuid
)
LANGUAGE plpgsql
AS $function$
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
$function$;

-- 21. update_member_role
DROP FUNCTION IF EXISTS public.update_member_role(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.update_member_role(p_family_id uuid, p_member_user_id uuid, p_new_role text)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RETURN json_build_object('success', false, 'message', 'Apenas o dono da família pode alterar papéis');
  END IF;
  IF v_user_id = p_member_user_id THEN
    RETURN json_build_object('success', false, 'message', 'O dono da família não pode alterar o seu próprio papel');
  END IF;
  IF p_new_role = 'owner' THEN
    RETURN json_build_object('success', false, 'message', 'Não é possível criar outro dono da família');
  END IF;
  IF p_new_role NOT IN ('admin', 'member', 'viewer') THEN
    RETURN json_build_object('success', false, 'message', 'Papel inválido');
  END IF;
  UPDATE family_members
  SET 
    role = p_new_role,
    permissions = CASE 
      WHEN p_new_role = 'admin' THEN ARRAY['view_transactions', 'add_transactions', 'manage_members']
      WHEN p_new_role = 'member' THEN ARRAY['view_transactions', 'add_transactions']
      WHEN p_new_role = 'viewer' THEN ARRAY['view_transactions']
      ELSE ARRAY['view_transactions']
    END
  WHERE family_id = p_family_id AND user_id = p_member_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Membro não encontrado na família');
  END IF;
  RETURN json_build_object(
    'success', true, 
    'message', 'Papel atualizado com sucesso'
  );
END;
$function$; 