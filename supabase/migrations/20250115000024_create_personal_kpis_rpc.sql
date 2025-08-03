-- Create RPC function for personal KPIs
CREATE OR REPLACE FUNCTION get_personal_kpis()
RETURNS TABLE (
  total_balance DECIMAL(10,2),
  credit_card_debt DECIMAL(10,2),
  top_goal_progress DECIMAL(5,2),
  monthly_savings DECIMAL(10,2),
  goals_account_balance DECIMAL(10,2),
  total_goals_value DECIMAL(10,2),
  goals_progress_percentage DECIMAL(5,2),
  total_budget_spent DECIMAL(10,2),
  total_budget_amount DECIMAL(10,2),
  budget_spent_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
BEGIN
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo_atual, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = auth.uid() 
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = auth.uid() AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = auth.uid() AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN QUERY
  SELECT
    -- Total balance (regular accounts only)
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo_atual ELSE 0 END), 0) as total_balance,
    
    -- Credit card debt
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo_atual < 0 THEN ABS(saldo_atual) ELSE 0 END), 0) as credit_card_debt,
    
    -- Top goal progress
    top_goal_prog as top_goal_progress,
    
    -- Monthly savings (simplified calculation)
    COALESCE(SUM(CASE 
      WHEN t.data LIKE current_month || '%' AND t.tipo = 'receita' THEN t.valor
      ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
      WHEN t.data LIKE current_month || '%' AND t.tipo = 'despesa' THEN t.valor
      ELSE 0 
    END), 0) as monthly_savings,
    
    -- Goals account balance
    goals_account_bal as goals_account_balance,
    
    -- Total goals value
    total_goals_val as total_goals_value,
    
    -- Goals progress percentage
    goals_progress_percentage as goals_progress_percentage,
    
    -- Total budget spent
    COALESCE(SUM(bp.valor_gasto), 0) as total_budget_spent,
    
    -- Total budget amount
    COALESCE(SUM(bp.valor_orcamento), 0) as total_budget_amount,
    
    -- Budget spent percentage
    CASE 
      WHEN COALESCE(SUM(bp.valor_orcamento), 0) > 0 
      THEN (COALESCE(SUM(bp.valor_gasto), 0) / COALESCE(SUM(bp.valor_orcamento), 0)) * 100
      ELSE 0 
    END as budget_spent_percentage
    
  FROM accounts a
  LEFT JOIN transactions t ON t.user_id = auth.uid() AND t.family_id IS NULL
  LEFT JOIN budget_progress bp ON bp.user_id = auth.uid()
  WHERE a.user_id = auth.uid() AND a.family_id IS NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_personal_kpis() TO authenticated; 