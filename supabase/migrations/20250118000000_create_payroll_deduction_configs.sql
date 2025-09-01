-- Migration: Create payroll_deduction_configs table
-- This migration creates the deduction configuration table for payroll contracts

BEGIN;

-- Create payroll_deduction_configs table
CREATE TABLE "public"."payroll_deduction_configs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "family_id" uuid,
    "contract_id" uuid NOT NULL,
    "deduction_type" text NOT NULL,
    "amount_cents" integer NOT NULL DEFAULT 0,
    "percentage" numeric(5,2),
    "description" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "effective_from" date,
    "effective_to" date,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."payroll_deduction_configs" ENABLE ROW LEVEL SECURITY;

-- Add primary key
ALTER TABLE "public"."payroll_deduction_configs" ADD CONSTRAINT "payroll_deduction_configs_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_family_id_fkey" 
FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;

ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_contract_id_fkey" 
FOREIGN KEY ("contract_id") REFERENCES "public"."payroll_contracts"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX "idx_payroll_deduction_configs_user_id" 
ON "public"."payroll_deduction_configs" ("user_id");

CREATE INDEX "idx_payroll_deduction_configs_family_id" 
ON "public"."payroll_deduction_configs" ("family_id");

CREATE INDEX "idx_payroll_deduction_configs_contract_id" 
ON "public"."payroll_deduction_configs" ("contract_id");

CREATE INDEX "idx_payroll_deduction_configs_type" 
ON "public"."payroll_deduction_configs" ("deduction_type");

CREATE INDEX "idx_payroll_deduction_configs_active" 
ON "public"."payroll_deduction_configs" ("is_active");

-- Add check constraints
ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_amount_non_negative" 
CHECK ("amount_cents" >= 0);

ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_percentage_valid" 
CHECK ("percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100));

ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_amount_or_percentage" 
CHECK (("amount_cents" > 0 AND "percentage" IS NULL) OR ("amount_cents" = 0 AND "percentage" IS NOT NULL));

ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_effective_dates" 
CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from");

-- Add valid deduction types constraint
ALTER TABLE "public"."payroll_deduction_configs" 
ADD CONSTRAINT "payroll_deduction_configs_valid_type" 
CHECK ("deduction_type" IN ('health_insurance', 'union_fee', 'loan_repayment', 'advance_payment', 'other'));

-- Create RLS policies
CREATE POLICY "Users can view own deduction configs" 
ON "public"."payroll_deduction_configs"
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deduction configs" 
ON "public"."payroll_deduction_configs"
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deduction configs" 
ON "public"."payroll_deduction_configs"
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deduction configs" 
ON "public"."payroll_deduction_configs"
FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER "update_payroll_deduction_configs_updated_at" 
BEFORE UPDATE ON "public"."payroll_deduction_configs" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comments for documentation
COMMENT ON TABLE "public"."payroll_deduction_configs" IS 
'Deduction configurations for payroll contracts';

COMMENT ON COLUMN "public"."payroll_deduction_configs"."deduction_type" IS 
'Type of deduction: health_insurance, union_fee, loan_repayment, advance_payment, other';

COMMENT ON COLUMN "public"."payroll_deduction_configs"."amount_cents" IS 
'Fixed deduction amount in cents (mutually exclusive with percentage)';

COMMENT ON COLUMN "public"."payroll_deduction_configs"."percentage" IS 
'Percentage deduction (0-100, mutually exclusive with amount_cents)';

COMMENT ON COLUMN "public"."payroll_deduction_configs"."effective_from" IS 
'Date from which this deduction becomes effective';

COMMENT ON COLUMN "public"."payroll_deduction_configs"."effective_to" IS 
'Date until which this deduction is effective (null for indefinite)';

COMMIT;

-- Success message
SELECT 'Payroll deduction configs table created successfully!' as message;