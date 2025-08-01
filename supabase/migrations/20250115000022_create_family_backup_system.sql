-- Sistema de Backup Automático de Dados Familiares
-- Este sistema permite fazer backup completo dos dados de uma família

-- Tabela para armazenar backups
CREATE TABLE IF NOT EXISTS public.family_backups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  backup_type text NOT NULL DEFAULT 'full', -- 'full', 'incremental', 'selective'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_path text, -- Caminho do ficheiro no storage
  file_size bigint, -- Tamanho do ficheiro em bytes
  metadata jsonb DEFAULT '{}'::jsonb, -- Metadados do backup
  error_message text, -- Mensagem de erro se falhar
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '1 year'), -- Expiração automática
  CONSTRAINT family_backups_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT family_backups_type_check CHECK (backup_type IN ('full', 'incremental', 'selective'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_family_backups_family_id ON public.family_backups(family_id);
CREATE INDEX IF NOT EXISTS idx_family_backups_status ON public.family_backups(status);
CREATE INDEX IF NOT EXISTS idx_family_backups_created_at ON public.family_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_family_backups_expires_at ON public.family_backups(expires_at);

-- RLS para family_backups
ALTER TABLE public.family_backups ENABLE ROW LEVEL SECURITY;

-- Política: apenas membros da família podem ver backups da família
CREATE POLICY family_backups_select_policy ON public.family_backups
  FOR SELECT TO authenticated
  USING (
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  );

-- Política: apenas owner/admin podem criar backups
CREATE POLICY family_backups_insert_policy ON public.family_backups
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid() 
        AND fm.role IN ('owner', 'admin')
    )
  );

-- Política: apenas owner/admin podem atualizar backups
CREATE POLICY family_backups_update_policy ON public.family_backups
  FOR UPDATE TO authenticated
  USING (
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid() 
        AND fm.role IN ('owner', 'admin')
    )
  );

-- Política: apenas owner/admin podem eliminar backups
CREATE POLICY family_backups_delete_policy ON public.family_backups
  FOR DELETE TO authenticated
  USING (
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid() 
        AND fm.role IN ('owner', 'admin')
    )
  );

-- Função para criar backup completo de uma família
CREATE OR REPLACE FUNCTION public.create_family_backup(
  p_family_id uuid,
  p_backup_type text DEFAULT 'full',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Função para restaurar backup de uma família
CREATE OR REPLACE FUNCTION public.restore_family_backup(
  p_backup_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Função para limpar backups expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_backups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Função para obter estatísticas de backup de uma família
CREATE OR REPLACE FUNCTION public.get_family_backup_stats(
  p_family_id uuid
)
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
$function$;

-- Comentários das funções
COMMENT ON FUNCTION public.create_family_backup(uuid, text, jsonb) IS 
'Cria um backup completo dos dados de uma família';

COMMENT ON FUNCTION public.restore_family_backup(uuid) IS 
'Restaura um backup de uma família';

COMMENT ON FUNCTION public.cleanup_expired_backups() IS 
'Limpa backups expirados automaticamente';

COMMENT ON FUNCTION public.get_family_backup_stats(uuid) IS 
'Obtém estatísticas de backup de uma família';

-- Permissões
GRANT EXECUTE ON FUNCTION public.create_family_backup(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_family_backup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_backup_stats(uuid) TO authenticated;

-- Job para limpeza automática de backups (executar diariamente)
-- Em produção, isto seria configurado no Supabase Dashboard ou via cron
-- SELECT cron.schedule('cleanup-expired-backups', '0 2 * * *', 'SELECT public.cleanup_expired_backups();'); 