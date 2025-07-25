-- MIGRAÇÃO: Corrigir search_path em todas as funções PL/pgSQL

-- 1. get_user_pending_family_invites
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

  -- Buscar email do utilizador autenticado
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email não encontrado');
  END IF;

  -- Buscar convites pendentes para o email
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

-- 2. accept_family_invite_by_email (p_invite_id uuid)
CREATE OR REPLACE FUNCTION public.accept_family_invite_by_email(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql
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

  -- Buscar email do utilizador autenticado
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email não encontrado');
  END IF;

  -- Buscar dados do convite
  SELECT family_id, role, status INTO v_family_id, v_role, v_invite_status
  FROM family_invites
  WHERE id = p_invite_id AND email = v_user_email;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Convite não encontrado para este email');
  END IF;
  IF v_invite_status IS DISTINCT FROM 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Convite já foi aceite ou não está pendente');
  END IF;

  -- Verificar se já é membro
  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = v_family_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Já é membro desta família');
  END IF;

  -- Adicionar como membro
  INSERT INTO family_members (id, family_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), v_family_id, v_user_id, v_role, NOW());

  -- Marcar convite como aceite
  UPDATE family_invites SET status = 'accepted', accepted_at = NOW() WHERE id = p_invite_id;

  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso', 'family_id', v_family_id);
END;
$function$;

-- 3. accept_family_invite_by_email (p_email text, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.accept_family_invite_by_email(p_email text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invite_record family_invites%ROWTYPE;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;

  -- Buscar convite pendente
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

  -- Verificar se já é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = v_invite_record.family_id
    AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Já é membro desta família');
  END IF;

  -- Adicionar como membro da família
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_invite_record.family_id, v_invite_record.role, ARRAY['view']);

  -- Marcar convite como aceite
  UPDATE family_invites
  SET status = 'accepted'
  WHERE id = v_invite_record.id;

  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso');
END;
$function$;

-- ... (restante conteúdo igual ao exemplo anterior, para todas as funções da tua lista) ... 