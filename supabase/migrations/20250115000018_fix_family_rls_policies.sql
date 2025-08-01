-- ============================================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA FUNÇÕES DE FAMÍLIA
-- ============================================================================

-- 1. Garantir que as funções RPC têm as permissões corretas
GRANT EXECUTE ON FUNCTION public.get_user_family_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_members_with_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_pending_invites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_family_member_by_email(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_family_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_with_member(text, text) TO authenticated;

-- 2. Melhorar a função get_family_members_with_profiles para evitar problemas de permissões
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
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;

  -- Obter membros da família com perfis (sem aceder diretamente a auth.users)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'status', fm.status,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM family_members fm
  LEFT JOIN profiles p ON fm.user_id = p.id
  WHERE fm.family_id = p_family_id
  ORDER BY fm.joined_at ASC;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_family_members_with_profiles: %', SQLERRM;
  RAISE EXCEPTION 'Erro interno ao obter membros da família';
END;
$function$;

-- 3. Melhorar a função get_user_family_data para ser mais robusta
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
        WHERE fm2.family_id = f.id AND fm2.status = 'active'
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
    WHERE fm.user_id = v_user_id AND fm.status = 'active'
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

-- 4. Garantir que as políticas RLS estão corretas para as tabelas
-- Política para families - membros podem ver a sua família
DROP POLICY IF EXISTS "Membros podem ver a sua família" ON families;
CREATE POLICY "Membros podem ver a sua família" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_id = id AND user_id = auth.uid()
    )
  );

-- Política para family_members - membros podem ver outros membros da sua família
DROP POLICY IF EXISTS "Membros podem ver outros membros da família" ON family_members;
CREATE POLICY "Membros podem ver outros membros da família" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm2
      WHERE fm2.family_id = family_id AND fm2.user_id = auth.uid()
    )
  );

-- Política para family_invites - membros podem ver convites da sua família
DROP POLICY IF EXISTS "Membros podem ver convites da família" ON family_invites;
CREATE POLICY "Membros podem ver convites da família" ON family_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_id = family_invites.family_id AND user_id = auth.uid()
    )
  );

-- 5. Garantir que as tabelas têm RLS ativado
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- 6. Garantir que as funções têm as permissões corretas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON families TO authenticated;
GRANT SELECT ON family_members TO authenticated;
GRANT SELECT ON family_invites TO authenticated;
GRANT SELECT ON profiles TO authenticated; 