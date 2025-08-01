-- Função para eliminar família com cascade de todos os dados relacionados
-- Apenas o owner da família pode executar esta operação

CREATE OR REPLACE FUNCTION public.delete_family_with_cascade(p_family_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_family_record RECORD;
  v_result JSON;
  v_deleted_count INTEGER := 0;
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
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- 2. Eliminar transações da família
    DELETE FROM transactions WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 3. Eliminar orçamentos da família
    DELETE FROM budgets 
    WHERE user_id IN (
      SELECT user_id FROM family_members WHERE family_id = p_family_id
    );
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 4. Eliminar objetivos da família
    DELETE FROM goals WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 5. Eliminar contas da família
    DELETE FROM accounts WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 6. Eliminar categorias da família
    DELETE FROM categories WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 7. Eliminar convites da família
    DELETE FROM family_invites WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 8. Eliminar membros da família
    DELETE FROM family_members WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- 9. Finalmente, eliminar a família
    DELETE FROM families WHERE id = p_family_id;
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
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
$function$;

-- Comentário da função
COMMENT ON FUNCTION public.delete_family_with_cascade(uuid) IS 
'Elimina uma família e todos os dados relacionados (cascade). Apenas o owner da família pode executar esta operação.';

-- Política de segurança para a função
GRANT EXECUTE ON FUNCTION public.delete_family_with_cascade(uuid) TO authenticated; 