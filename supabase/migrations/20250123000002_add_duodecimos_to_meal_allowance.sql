-- Migration: Add duodecimos payment option to payroll_meal_allowance_configs
-- This migration adds duodecimos_enabled column to support 12-month payment distribution
-- Based on Portuguese legislation allowing advance payment of meal allowance

BEGIN;

-- Step 1: Add duodecimos_enabled column
ALTER TABLE public.payroll_meal_allowance_configs 
  ADD COLUMN duodecimos_enabled boolean DEFAULT false;

-- Step 2: Add comment to document the field
COMMENT ON COLUMN public.payroll_meal_allowance_configs.duodecimos_enabled IS 
'Enable duodecimos payment: distribute annual meal allowance across 12 months including vacation periods';

-- Step 3: Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payroll_meal_allowance_configs_duodecimos 
  ON public.payroll_meal_allowance_configs (duodecimos_enabled);

COMMIT;

-- Success message
SELECT 'Duodecimos field added to payroll_meal_allowance_configs successfully!' as message;