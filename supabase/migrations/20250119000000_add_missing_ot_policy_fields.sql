-- Add missing threshold_hours and multiplier fields to payroll_ot_policies table
-- These fields are required by the overtime calculation services
-- Note: daily_limit_hours, weekly_limit_hours, annual_limit_hours already exist

ALTER TABLE "public"."payroll_ot_policies" 
ADD COLUMN "threshold_hours" numeric(4,2) DEFAULT 8.0 NOT NULL,
ADD COLUMN "multiplier" numeric(3,2) DEFAULT 1.5 NOT NULL;

-- Add constraints to ensure positive values
ALTER TABLE "public"."payroll_ot_policies" 
ADD CONSTRAINT "payroll_ot_policies_threshold_positive" CHECK (threshold_hours > 0),
ADD CONSTRAINT "payroll_ot_policies_multiplier_valid" CHECK (multiplier >= 1.0);

-- Add comments for documentation
COMMENT ON COLUMN "public"."payroll_ot_policies"."threshold_hours" IS 'Número de horas diárias antes de aplicar horas extras';
COMMENT ON COLUMN "public"."payroll_ot_policies"."multiplier" IS 'Multiplicador base para horas extras';