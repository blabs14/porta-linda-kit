-- Triggers para notificações automáticas de família
-- Estes triggers monitoram eventos importantes e criam notificações automaticamente

-- Função para criar notificação
CREATE OR REPLACE FUNCTION public.create_family_notification(
  p_family_id uuid,
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_category text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para novos membros da família
CREATE OR REPLACE FUNCTION public.handle_new_family_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para mudanças de papel
CREATE OR REPLACE FUNCTION public.handle_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para remoção de membros
CREATE OR REPLACE FUNCTION public.handle_member_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para novos convites
CREATE OR REPLACE FUNCTION public.handle_new_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para transações grandes
CREATE OR REPLACE FUNCTION public.handle_large_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Trigger para orçamentos excedidos
CREATE OR REPLACE FUNCTION public.handle_budget_exceeded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Aplicar os triggers
DROP TRIGGER IF EXISTS trigger_new_family_member ON family_members;
CREATE TRIGGER trigger_new_family_member
  AFTER INSERT ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_family_member();

DROP TRIGGER IF EXISTS trigger_member_role_change ON family_members;
CREATE TRIGGER trigger_member_role_change
  AFTER UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_member_role_change();

DROP TRIGGER IF EXISTS trigger_member_removal ON family_members;
CREATE TRIGGER trigger_member_removal
  AFTER DELETE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_member_removal();

DROP TRIGGER IF EXISTS trigger_new_invite ON family_invites;
CREATE TRIGGER trigger_new_invite
  AFTER INSERT ON family_invites
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_invite();

DROP TRIGGER IF EXISTS trigger_large_transaction ON transactions;
CREATE TRIGGER trigger_large_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_large_transaction();

DROP TRIGGER IF EXISTS trigger_budget_exceeded ON budgets;
CREATE TRIGGER trigger_budget_exceeded
  AFTER INSERT OR UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION handle_budget_exceeded();

-- Comentários das funções
COMMENT ON FUNCTION public.create_family_notification(uuid, uuid, text, text, text, text, jsonb) IS 
'Cria notificações para todos os membros de uma família';

COMMENT ON FUNCTION public.handle_new_family_member() IS 
'Trigger que cria notificação quando um novo membro se junta à família';

COMMENT ON FUNCTION public.handle_member_role_change() IS 
'Trigger que cria notificação quando o papel de um membro é alterado';

COMMENT ON FUNCTION public.handle_member_removal() IS 
'Trigger que cria notificação quando um membro é removido da família';

COMMENT ON FUNCTION public.handle_new_invite() IS 
'Trigger que cria notificação quando um novo convite é enviado';

COMMENT ON FUNCTION public.handle_large_transaction() IS 
'Trigger que cria notificação para transações grandes (>1000€)';

COMMENT ON FUNCTION public.handle_budget_exceeded() IS 
'Trigger que cria notificação quando um orçamento é excedido';

-- Permissões
GRANT EXECUTE ON FUNCTION public.create_family_notification(uuid, uuid, text, text, text, text, jsonb) TO authenticated; 