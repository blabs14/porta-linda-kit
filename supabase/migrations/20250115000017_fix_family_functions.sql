-- Corrigir funções RPC de família para funcionarem com autenticação

-- Função para criar família (versão simplificada)
CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_description text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Função para obter dados da família do utilizador (versão simplificada)
CREATE OR REPLACE FUNCTION public.get_user_family_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::json;
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
$function$;

-- Função para obter membros da família com perfis
CREATE OR REPLACE FUNCTION public.get_family_members_with_profiles(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'permissions', fm.permissions,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, ''),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM family_members fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id
  WHERE fm.family_id = p_family_id
  ORDER BY fm.joined_at ASC;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

-- Função para obter convites pendentes da família
CREATE OR REPLACE FUNCTION public.get_family_pending_invites(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'invited_by', fi.invited_by,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at,
      'token', fi.token,
      'accepted_at', fi.accepted_at
    )
  ) INTO v_result
  FROM family_invites fi
  WHERE fi.family_id = p_family_id AND fi.status = 'pending'
  ORDER BY fi.created_at DESC;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

-- Função para convidar membro da família
CREATE OR REPLACE FUNCTION public.invite_family_member_by_email(p_family_id uuid, p_email text, p_role text DEFAULT 'member')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_invite_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin ou owner da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente';
  END IF;

  -- Verificar se já existe um convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM family_invites 
    WHERE family_id = p_family_id 
    AND email = p_email 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este email';
  END IF;

  -- Criar convite
  INSERT INTO family_invites (family_id, email, role, invited_by, expires_at)
  VALUES (
    p_family_id,
    p_email,
    p_role,
    v_user_id,
    now() + interval '7 days'
  )
  RETURNING id INTO v_invite_id;

  -- Retornar resultado
  SELECT json_build_object(
    'id', fi.id,
    'family_id', fi.family_id,
    'email', fi.email,
    'role', fi.role,
    'status', fi.status,
    'invited_by', fi.invited_by,
    'created_at', fi.created_at,
    'expires_at', fi.expires_at
  ) INTO v_result
  FROM family_invites fi
  WHERE fi.id = v_invite_id;

  RETURN v_result;
END;
$function$;

-- Função para cancelar convite
CREATE OR REPLACE FUNCTION public.cancel_family_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_family_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter o family_id do convite
  SELECT family_id INTO v_family_id
  FROM family_invites
  WHERE id = p_invite_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;

  -- Verificar se o utilizador é admin ou owner da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = v_family_id 
    AND user_id = v_user_id 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente';
  END IF;

  -- Cancelar convite
  UPDATE family_invites
  SET status = 'cancelled'
  WHERE id = p_invite_id;

  RETURN json_build_object('success', true, 'message', 'Convite cancelado com sucesso');
END;
$function$;

-- Função para aceitar convite
CREATE OR REPLACE FUNCTION public.accept_family_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_invite RECORD;
  v_family_id UUID;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter dados do convite
  SELECT * INTO v_invite
  FROM family_invites
  WHERE id = p_invite_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Convite não está pendente';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  -- Verificar se o email do convite corresponde ao email do utilizador
  IF v_invite.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Email não corresponde ao convite';
  END IF;

  -- Verificar se já é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = v_invite.family_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Já é membro desta família';
  END IF;

  -- Aceitar convite
  UPDATE family_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invite_id;

  -- Adicionar como membro da família
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (v_user_id, v_invite.family_id, v_invite.role, ARRAY['view_transactions']);

  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso');
END;
$function$; 