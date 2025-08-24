-- Migration: Add payment_method to payroll_meal_allowance_configs
-- This migration adds payment_method column to support different meal allowance payment types
-- Based on Portuguese legislation: cash (6€/day limit) vs card/voucher (10.20€/day limit)

BEGIN;

-- Step 1: Add payment_method column with enum type
CREATE TYPE meal_allowance_payment_method AS ENUM ('cash', 'card');

-- Step 2: Add payment_method column to the table
ALTER TABLE public.payroll_meal_allowance_configs 
  ADD COLUMN payment_method meal_allowance_payment_method DEFAULT 'card';

-- Step 3: Add comment to document the field
COMMENT ON COLUMN public.payroll_meal_allowance_configs.payment_method IS 
'Payment method for meal allowance: cash (6€/day IRS/SS exemption limit) or card/voucher (10.20€/day exemption limit as of 2025)';

-- Step 4: Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payroll_meal_allowance_configs_payment_method 
  ON public.payroll_meal_allowance_configs (payment_method);

COMMIT;

-- Success message
SELECT 'Payment method field added to payroll_meal_allowance_configs successfully!' as message;