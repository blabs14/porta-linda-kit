-- Create RPC function for personal budgets
CREATE OR REPLACE FUNCTION get_personal_budgets()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  categoria_id UUID,
  mes TEXT,
  valor_limite DECIMAL(10,2),
  valor_gasto DECIMAL(10,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.user_id,
    b.categoria_id,
    b.mes,
    b.valor_limite,
    b.valor_gasto,
    b.created_at,
    b.updated_at
  FROM budgets b
  WHERE b.family_id IS NULL
  ORDER BY b.mes DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_personal_budgets() TO authenticated; 