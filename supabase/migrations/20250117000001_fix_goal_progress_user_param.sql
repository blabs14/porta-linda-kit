-- Fix get_user_goal_progress function to accept user_id parameter
-- This ensures proper data isolation and cache invalidation

CREATE OR REPLACE FUNCTION public.get_user_goal_progress(user_id uuid DEFAULT NULL)
 RETURNS TABLE(goal_id uuid, nome text, valor_objetivo numeric, total_alocado numeric, progresso_percentual numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(user_id, auth.uid());
  
  -- Validate that we have a valid user ID
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  RETURN QUERY
  SELECT 
    gp.goal_id,
    gp.nome,
    gp.valor_objetivo,
    gp.total_alocado,
    gp.progresso_percentual
  FROM goal_progress gp
  WHERE EXISTS (
    SELECT 1 FROM goals g 
    WHERE g.id = gp.goal_id 
    AND g.user_id = v_user_id
  );
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_goal_progress(uuid) IS 'Returns goal progress for a specific user. Accepts optional user_id parameter, defaults to auth.uid() for backward compatibility.';