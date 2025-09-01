-- Migration: Create payroll_meal_allowance_configs table
-- This migration creates the meal allowance configuration table for payroll contracts

BEGIN;

-- Create payroll_meal_allowance_configs table
CREATE TABLE "public"."payroll_meal_allowance_configs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "family_id" uuid,
    "daily_amount_cents" integer NOT NULL DEFAULT 0,
    "excluded_months" integer[] DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."payroll_meal_allowance_configs" ENABLE ROW LEVEL SECURITY;

-- Add primary key
ALTER TABLE "public"."payroll_meal_allowance_configs" ADD CONSTRAINT "payroll_meal_allowance_configs_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE "public"."payroll_meal_allowance_configs" 
ADD CONSTRAINT "payroll_meal_allowance_configs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."payroll_meal_allowance_configs" 
ADD CONSTRAINT "payroll_meal_allowance_configs_family_id_fkey" 
FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX "idx_payroll_meal_allowance_configs_user_id" 
ON "public"."payroll_meal_allowance_configs" ("user_id");

CREATE INDEX "idx_payroll_meal_allowance_configs_family_id" 
ON "public"."payroll_meal_allowance_configs" ("family_id");

-- Add check constraints
ALTER TABLE "public"."payroll_meal_allowance_configs" 
ADD CONSTRAINT "payroll_meal_allowance_configs_daily_amount_non_negative" 
CHECK ("daily_amount_cents" >= 0);

-- Create RLS policies
CREATE POLICY "Users can view own meal allowance configs" 
ON "public"."payroll_meal_allowance_configs"
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal allowance configs" 
ON "public"."payroll_meal_allowance_configs"
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal allowance configs" 
ON "public"."payroll_meal_allowance_configs"
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal allowance configs" 
ON "public"."payroll_meal_allowance_configs"
FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER "update_payroll_meal_allowance_configs_updated_at" 
BEFORE UPDATE ON "public"."payroll_meal_allowance_configs" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comments for documentation
COMMENT ON TABLE "public"."payroll_meal_allowance_configs" IS 
'Meal allowance configurations for payroll contracts';

COMMENT ON COLUMN "public"."payroll_meal_allowance_configs"."daily_amount_cents" IS 
'Daily meal allowance amount in cents';

COMMENT ON COLUMN "public"."payroll_meal_allowance_configs"."excluded_months" IS 
'Array of months (1-12) where meal allowance is not paid';

COMMIT;

-- Success message
SELECT 'Payroll meal allowance configs table created successfully!' as message;