-- Remove old meal allowance fields from payroll_contracts table
-- These fields have been replaced by the new payroll_meal_allowance_configs table

-- Drop the constraint first
ALTER TABLE "public"."payroll_contracts" DROP CONSTRAINT IF EXISTS "payroll_contracts_meal_allowance_non_negative";

-- Remove the old meal allowance fields
ALTER TABLE "public"."payroll_contracts" DROP COLUMN IF EXISTS "meal_allowance_cents_per_day";
ALTER TABLE "public"."payroll_contracts" DROP COLUMN IF EXISTS "meal_on_worked_days";

-- Add comment to document the change
COMMENT ON TABLE "public"."payroll_contracts" IS 'Payroll contracts table. Meal allowance configuration moved to payroll_meal_allowance_configs table.';