-- Migração: Corrigir search_path em todas as funções PL/pgSQL (versão final)
-- Data: 2025-01-15
-- Problema: Funções com search_path mutável podem causar vulnerabilidades de segurança

-- Primeiro, remover todos os triggers que dependem das funções
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
DROP TRIGGER IF EXISTS update_family_invites_updated_at ON public.family_invites;
DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
DROP TRIGGER IF EXISTS update_fixed_expenses_updated_at ON public.fixed_expenses;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
DROP TRIGGER IF EXISTS update_attachments_updated_at ON public.attachments;
DROP TRIGGER IF EXISTS update_audit_logs_updated_at ON public.audit_logs;

-- Remover políticas RLS que dependem das funções
DROP POLICY IF EXISTS families_member_access ON public.families;
DROP POLICY IF EXISTS transactions_select_family ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_family ON public.transactions;
DROP POLICY IF EXISTS transactions_update_family ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_family ON public.transactions;
DROP POLICY IF EXISTS goals_select_family ON public.goals;
DROP POLICY IF EXISTS goals_insert_family ON public.goals;
DROP POLICY IF EXISTS goals_update_family ON public.goals;
DROP POLICY IF EXISTS goals_delete_family ON public.goals;
DROP POLICY IF EXISTS family_members_select ON public.family_members;

-- Agora recriar as funções com search_path fixo
-- 1. get_user_families (função crítica que outras dependem)
DROP FUNCTION IF EXISTS public.get_user_families(p_user_id uuid);
CREATE OR REPLACE FUNCTION public.get_user_families(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_family_ids uuid[];
BEGIN
  SET search_path = public, pg_temp;
  SELECT array_agg(family_id) INTO v_family_ids
  FROM family_members
  WHERE user_id = p_user_id;
  RETURN COALESCE(v_family_ids, ARRAY[]::uuid[]);
END;
$function$;

-- 2. validate_family_permission
DROP FUNCTION IF EXISTS public.validate_family_permission(p_family_id uuid, p_required_role text);
CREATE OR REPLACE FUNCTION public.validate_family_permission(p_family_id uuid, p_required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_has_permission boolean;
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
  -- Hierarquia de roles: owner > admin > member > viewer
  CASE p_required_role
    WHEN 'owner' THEN v_has_permission := v_user_role = 'owner';
    WHEN 'admin' THEN v_has_permission := v_user_role IN ('owner', 'admin');
    WHEN 'member' THEN v_has_permission := v_user_role IN ('owner', 'admin', 'member');
    WHEN 'viewer' THEN v_has_permission := v_user_role IN ('owner', 'admin', 'member', 'viewer');
    ELSE v_has_permission := false;
  END CASE;
  RETURN v_has_permission;
END;
$function$;

-- 3. accept_family_invite_by_email (p_invite_id uuid)
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

-- 4. accept_family_invite_by_email (p_email text, p_user_id uuid)
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

-- 5. get_user_pending_family_invites
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
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'family_name', f.nome,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at,
      'invited_by', fi.invited_by
    )
  ) INTO v_result
  FROM family_invites fi
  JOIN families f ON f.id = fi.family_id
  WHERE fi.email = v_user_email AND fi.status = 'pending';
  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::json));
END;
$function$;

-- 6. log_permission_check
DROP FUNCTION IF EXISTS public.log_permission_check(p_operation text, p_table_name text, p_user_id uuid, p_result text, p_details json);
CREATE OR REPLACE FUNCTION public.log_permission_check(
  p_operation text,
  p_table_name text,
  p_user_id uuid,
  p_result text,
  p_details json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO debug_logs (operation, table_name, user_id, result, details)
  VALUES (p_operation, p_table_name, p_user_id, p_result = 'success', p_details);
END;
$function$;

-- 7. get_user_family_data
DROP FUNCTION IF EXISTS public.get_user_family_data(p_user_id uuid);
CREATE OR REPLACE FUNCTION public.get_user_family_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_agg(
    json_build_object(
      'family_id', fm.family_id,
      'family_name', f.nome,
      'role', fm.role,
      'joined_at', fm.joined_at
    )
  ) INTO v_result
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.user_id = p_user_id;
  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

-- 8. create_family_with_member
DROP FUNCTION IF EXISTS public.create_family_with_member(p_family_name text, p_user_id uuid);
CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_family_id uuid;
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar se o utilizador já tem uma família
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador já pertence a uma família');
  END IF;
  -- Criar família
  INSERT INTO families (nome, created_by)
  VALUES (p_family_name, p_user_id)
  RETURNING id INTO v_family_id;
  -- Adicionar utilizador como owner
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (v_family_id, p_user_id, 'owner');
  RETURN json_build_object('success', true, 'family_id', v_family_id, 'message', 'Família criada com sucesso');
END;
$function$;

-- 9. invite_family_member_by_email
DROP FUNCTION IF EXISTS public.invite_family_member_by_email(p_family_id uuid, p_email text, p_role text, p_invited_by uuid);
CREATE OR REPLACE FUNCTION public.invite_family_member_by_email(p_family_id uuid, p_email text, p_role text, p_invited_by uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_invite_id uuid;
  v_token text;
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para convidar membros');
  END IF;
  -- Verificar se já existe convite pendente
  IF EXISTS (
    SELECT 1 FROM family_invites 
    WHERE family_id = p_family_id AND email = LOWER(p_email) AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Convite já existe para este email');
  END IF;
  -- Gerar token único
  v_token := encode(gen_random_bytes(32), 'hex');
  -- Criar convite
  INSERT INTO family_invites (family_id, email, role, invited_by, expires_at, token)
  VALUES (p_family_id, LOWER(p_email), p_role, p_invited_by, NOW() + INTERVAL '7 days', v_token)
  RETURNING id INTO v_invite_id;
  RETURN json_build_object('success', true, 'invite_id', v_invite_id, 'token', v_token);
END;
$function$;

-- 10. get_family_pending_invites
DROP FUNCTION IF EXISTS public.get_family_pending_invites(p_family_id uuid);
CREATE OR REPLACE FUNCTION public.get_family_pending_invites(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para ver convites');
  END IF;
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at,
      'invited_by', fi.invited_by
    )
  ) INTO v_result
  FROM family_invites fi
  WHERE fi.family_id = p_family_id AND fi.status = 'pending';
  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::json));
END;
$function$;

-- 11. cancel_family_invite
DROP FUNCTION IF EXISTS public.cancel_family_invite(p_invite_id uuid);
CREATE OR REPLACE FUNCTION public.cancel_family_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_family_id uuid;
BEGIN
  SET search_path = public, pg_temp;
  -- Obter family_id do convite
  SELECT family_id INTO v_family_id
  FROM family_invites
  WHERE id = p_invite_id;
  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Convite não encontrado');
  END IF;
  -- Verificar permissões
  IF NOT validate_family_permission(v_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para cancelar convite');
  END IF;
  -- Cancelar convite
  UPDATE family_invites
  SET status = 'declined'
  WHERE id = p_invite_id;
  RETURN json_build_object('success', true, 'message', 'Convite cancelado com sucesso');
END;
$function$;

-- 12. update_member_role
DROP FUNCTION IF EXISTS public.update_member_role(p_family_id uuid, p_user_id uuid, p_new_role text);
CREATE OR REPLACE FUNCTION public.update_member_role(p_family_id uuid, p_user_id uuid, p_new_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para alterar roles');
  END IF;
  -- Verificar se o role é válido
  IF p_new_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RETURN json_build_object('success', false, 'message', 'Role inválido');
  END IF;
  -- Atualizar role
  UPDATE family_members
  SET role = p_new_role
  WHERE family_id = p_family_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Membro não encontrado');
  END IF;
  RETURN json_build_object('success', true, 'message', 'Role atualizado com sucesso');
END;
$function$;

-- 13. remove_family_member
DROP FUNCTION IF EXISTS public.remove_family_member(p_family_id uuid, p_user_id uuid);
CREATE OR REPLACE FUNCTION public.remove_family_member(p_family_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id uuid;
  v_member_role text;
BEGIN
  SET search_path = public, pg_temp;
  v_current_user_id := auth.uid();
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para remover membros');
  END IF;
  -- Verificar se não está a tentar remover o último owner
  SELECT role INTO v_member_role
  FROM family_members
  WHERE family_id = p_family_id AND user_id = p_user_id;
  IF v_member_role = 'owner' THEN
    -- Verificar se é o único owner
    IF (SELECT COUNT(*) FROM family_members WHERE family_id = p_family_id AND role = 'owner') = 1 THEN
      RETURN json_build_object('success', false, 'message', 'Não pode remover o único owner da família');
    END IF;
  END IF;
  -- Remover membro
  DELETE FROM family_members
  WHERE family_id = p_family_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Membro não encontrado');
  END IF;
  RETURN json_build_object('success', true, 'message', 'Membro removido com sucesso');
END;
$function$;

-- 14. update_family_settings
DROP FUNCTION IF EXISTS public.update_family_settings(p_family_id uuid, p_settings jsonb);
CREATE OR REPLACE FUNCTION public.update_family_settings(p_family_id uuid, p_settings jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para alterar configurações');
  END IF;
  -- Atualizar configurações
  UPDATE families
  SET settings = p_settings, updated_at = NOW()
  WHERE id = p_family_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Família não encontrada');
  END IF;
  RETURN json_build_object('success', true, 'message', 'Configurações atualizadas com sucesso');
END;
$function$;

-- 15. get_user_all_transactions
DROP FUNCTION IF EXISTS public.get_user_all_transactions(p_user_id uuid);
CREATE OR REPLACE FUNCTION public.get_user_all_transactions(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'valor', t.valor,
      'data', t.data,
      'descricao', t.descricao,
      'categoria_id', t.categoria_id,
      'account_id', t.account_id,
      'family_id', t.family_id,
      'created_at', t.created_at
    )
  ) INTO v_result
  FROM transactions t
  WHERE t.user_id = p_user_id OR t.family_id IN (SELECT get_user_families(p_user_id))
  ORDER BY t.data DESC;
  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::json));
END;
$function$;

-- 16. get_family_members_with_profiles
DROP FUNCTION IF EXISTS public.get_family_members_with_profiles(p_family_id uuid);
CREATE OR REPLACE FUNCTION public.get_family_members_with_profiles(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  -- Verificar permissões
  IF NOT validate_family_permission(p_family_id, 'viewer') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissões para ver membros');
  END IF;
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', p.nome,
        'foto_url', p.foto_url,
        'percentual_divisao', p.percentual_divisao
      )
    )
  ) INTO v_result
  FROM family_members fm
  JOIN profiles p ON p.user_id = fm.user_id
  WHERE fm.family_id = p_family_id;
  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::json));
END;
$function$;

-- 17. trigger_set_timestamp
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

-- 18. update_updated_at_column
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 19. test_user_access
DROP FUNCTION IF EXISTS public.test_user_access(test_user_id uuid);
CREATE OR REPLACE FUNCTION public.test_user_access(test_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_build_object(
    'user_id', test_user_id,
    'is_authenticated', auth.uid() IS NOT NULL,
    'current_user', auth.uid(),
    'families', get_user_families(test_user_id),
    'family_data', get_user_family_data(test_user_id)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- 20. test_family_data_access
DROP FUNCTION IF EXISTS public.test_family_data_access(p_family_id uuid);
CREATE OR REPLACE FUNCTION public.test_family_data_access(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_build_object(
    'family_id', p_family_id,
    'has_access', validate_family_permission(p_family_id, 'viewer'),
    'is_admin', validate_family_permission(p_family_id, 'admin'),
    'is_owner', validate_family_permission(p_family_id, 'owner'),
    'members_count', (SELECT COUNT(*) FROM family_members WHERE family_id = p_family_id)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- 21. test_rls_policies_comprehensive
DROP FUNCTION IF EXISTS public.test_rls_policies_comprehensive();
CREATE OR REPLACE FUNCTION public.test_rls_policies_comprehensive()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
  v_user_id uuid;
BEGIN
  SET search_path = public, pg_temp;
  v_user_id := auth.uid();
  SELECT json_build_object(
    'user_id', v_user_id,
    'is_authenticated', v_user_id IS NOT NULL,
    'families', get_user_families(v_user_id),
    'can_read_transactions', (SELECT COUNT(*) FROM transactions LIMIT 1) >= 0,
    'can_read_accounts', (SELECT COUNT(*) FROM accounts LIMIT 1) >= 0,
    'can_read_goals', (SELECT COUNT(*) FROM goals LIMIT 1) >= 0
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- 22. test_get_user_family
DROP FUNCTION IF EXISTS public.test_get_user_family(p_user_id uuid);
CREATE OR REPLACE FUNCTION public.test_get_user_family(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SET search_path = public, pg_temp;
  SELECT json_build_object(
    'user_id', p_user_id,
    'families', get_user_families(p_user_id),
    'family_data', get_user_family_data(p_user_id)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- Agora recriar as políticas RLS com as funções corrigidas
-- families
CREATE POLICY families_member_access ON public.families FOR SELECT TO authenticated USING (
  (auth.uid() IS NOT NULL) AND (
    (created_by = auth.uid()) OR 
    (id IN (SELECT get_user_families(auth.uid())))
  )
);

-- transactions
CREATE POLICY transactions_select_family ON public.transactions FOR SELECT TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY transactions_insert_family ON public.transactions FOR INSERT TO authenticated WITH CHECK (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY transactions_update_family ON public.transactions FOR UPDATE TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
) WITH CHECK (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY transactions_delete_family ON public.transactions FOR DELETE TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

-- goals
CREATE POLICY goals_select_family ON public.goals FOR SELECT TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY goals_insert_family ON public.goals FOR INSERT TO authenticated WITH CHECK (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY goals_update_family ON public.goals FOR UPDATE TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
) WITH CHECK (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

CREATE POLICY goals_delete_family ON public.goals FOR DELETE TO authenticated USING (
  ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))
);

-- family_members
CREATE POLICY family_members_select ON public.family_members FOR SELECT TO authenticated USING (
  (auth.uid() IS NOT NULL) AND (family_id IN (SELECT get_user_families(auth.uid())))
);

-- Agora recriar os triggers com as funções corrigidas
-- profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- goals
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- accounts
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- families
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- family_members
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- family_invites
CREATE TRIGGER update_family_invites_updated_at
  BEFORE UPDATE ON public.family_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- budgets
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- fixed_expenses
CREATE TRIGGER update_fixed_expenses_updated_at
  BEFORE UPDATE ON public.fixed_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- notifications
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- reminders
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- settings
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- webhooks
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- attachments
CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- audit_logs
CREATE TRIGGER update_audit_logs_updated_at
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fim da migração 