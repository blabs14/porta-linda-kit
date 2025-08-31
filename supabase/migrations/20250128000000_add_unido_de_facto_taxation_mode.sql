-- Migration: Add 'unido_de_facto' marital status and taxation_mode field
-- Description: Extends payroll_deduction_conditions to support 'unido_de_facto' status and taxation mode

-- First, drop the existing check constraint on marital_status
ALTER TABLE payroll_deduction_conditions 
DROP CONSTRAINT IF EXISTS payroll_deduction_conditions_marital_status_check;

-- Add the new taxation_mode column (nullable, only relevant for married/unido_de_facto)
ALTER TABLE payroll_deduction_conditions 
ADD COLUMN IF NOT EXISTS taxation_mode TEXT 
CHECK (taxation_mode IS NULL OR taxation_mode IN ('conjunta', 'separada'));

-- Add the updated check constraint for marital_status to include 'unido_de_facto'
ALTER TABLE payroll_deduction_conditions 
ADD CONSTRAINT payroll_deduction_conditions_marital_status_check 
CHECK (marital_status IN ('single', 'married', 'unido_de_facto'));

-- Set default taxation_mode for existing 'married' records to maintain backward compatibility
-- This ensures existing contracts maintain their current behavior
UPDATE payroll_deduction_conditions 
SET taxation_mode = 'separada' 
WHERE marital_status = 'married' AND taxation_mode IS NULL;

-- Add a constraint to ensure taxation_mode is only set for married/unido_de_facto
ALTER TABLE payroll_deduction_conditions 
ADD CONSTRAINT payroll_deduction_conditions_taxation_mode_logic 
CHECK (
    (marital_status = 'single' AND taxation_mode IS NULL) OR
    (marital_status IN ('married', 'unido_de_facto') AND taxation_mode IS NOT NULL)
);

-- Add comment to document the new fields
COMMENT ON COLUMN payroll_deduction_conditions.taxation_mode IS 
'Taxation mode for married/unido_de_facto status: conjunta (joint) or separada (separate). Only relevant when marital_status is married or unido_de_facto.';

COMMENT ON CONSTRAINT payroll_deduction_conditions_marital_status_check ON payroll_deduction_conditions IS 
'Marital status: single, married, or unido_de_facto (de facto union)';

COMMENT ON CONSTRAINT payroll_deduction_conditions_taxation_mode_logic ON payroll_deduction_conditions IS 
'Ensures taxation_mode is NULL for single status and NOT NULL for married/unido_de_facto status';