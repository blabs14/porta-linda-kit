-- Migration: Remove family_id from payroll configuration tables
-- This migration removes family_id from payroll configuration tables as these should be contract-specific

BEGIN;

-- Remove family_id from payroll_contracts table
ALTER TABLE "public"."payroll_contracts" DROP COLUMN IF EXISTS "family_id";

-- Remove family_id from payroll_meal_allowance_configs and add contract_id
ALTER TABLE "public"."payroll_meal_allowance_configs" DROP COLUMN IF EXISTS "family_id";
ALTER TABLE "public"."payroll_meal_allowance_configs" ADD COLUMN IF NOT EXISTS "contract_id" uuid NOT NULL;

-- Add foreign key constraint for contract_id in meal allowance configs
ALTER TABLE "public"."payroll_meal_allowance_configs" 
ADD CONSTRAINT "payroll_meal_allowance_configs_contract_id_fkey" 
FOREIGN KEY ("contract_id") REFERENCES "public"."payroll_contracts"("id") ON DELETE CASCADE;

-- Remove family_id from payroll_deduction_configs (contract_id already exists)
ALTER TABLE "public"."payroll_deduction_configs" DROP COLUMN IF EXISTS "family_id";

-- Remove family_id from payroll_leaves (contract_id already exists)
ALTER TABLE "public"."payroll_leaves" DROP COLUMN IF EXISTS "family_id";

-- Add contract_id to payroll_vacations and remove family_id
ALTER TABLE "public"."payroll_vacations" DROP COLUMN IF EXISTS "family_id";
ALTER TABLE "public"."payroll_vacations" ADD COLUMN IF NOT EXISTS "contract_id" uuid NOT NULL;

-- Add foreign key constraint for contract_id in vacations
ALTER TABLE "public"."payroll_vacations" 
ADD CONSTRAINT "payroll_vacations_contract_id_fkey" 
FOREIGN KEY ("contract_id") REFERENCES "public"."payroll_contracts"("id") ON DELETE CASCADE;

-- Update RLS policies to use contract_id instead of family_id where applicable
-- Note: Existing policies will need to be reviewed and updated manually

COMMIT;