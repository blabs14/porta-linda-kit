-- Migration: Create payroll_bonus_configs table
-- Description: Creates table for storing bonus configuration data per contract

BEGIN;

-- Create payroll_bonus_configs table
CREATE TABLE IF NOT EXISTS "public"."payroll_bonus_configs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "family_id" uuid,
    "contract_id" uuid NOT NULL,
    "bonus_type" text NOT NULL CHECK (bonus_type IN ('mandatory', 'performance', 'custom')),
    "config_data" jsonb NOT NULL DEFAULT '{}',
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "payroll_bonus_configs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "public"."payroll_bonus_configs" 
    ADD CONSTRAINT "payroll_bonus_configs_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."payroll_bonus_configs" 
    ADD CONSTRAINT "payroll_bonus_configs_contract_id_fkey" 
    FOREIGN KEY ("contract_id") REFERENCES "public"."payroll_contracts"("id") ON DELETE CASCADE;

-- Create unique constraint for user_id, contract_id, bonus_type combination
CREATE UNIQUE INDEX "payroll_bonus_configs_user_contract_type_idx" 
    ON "public"."payroll_bonus_configs"("user_id", "contract_id", "bonus_type");

-- Create indexes for performance
CREATE INDEX "payroll_bonus_configs_user_id_idx" ON "public"."payroll_bonus_configs"("user_id");
CREATE INDEX "payroll_bonus_configs_contract_id_idx" ON "public"."payroll_bonus_configs"("contract_id");
CREATE INDEX "payroll_bonus_configs_bonus_type_idx" ON "public"."payroll_bonus_configs"("bonus_type");

-- Enable Row Level Security
ALTER TABLE "public"."payroll_bonus_configs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payroll bonus configs" ON "public"."payroll_bonus_configs"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payroll bonus configs" ON "public"."payroll_bonus_configs"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payroll bonus configs" ON "public"."payroll_bonus_configs"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payroll bonus configs" ON "public"."payroll_bonus_configs"
    FOR DELETE USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE "public"."payroll_bonus_configs" IS 'Configuration data for different types of bonuses per payroll contract';
COMMENT ON COLUMN "public"."payroll_bonus_configs"."bonus_type" IS 'Type of bonus: mandatory (vacation/christmas), performance, or custom';
COMMENT ON COLUMN "public"."payroll_bonus_configs"."config_data" IS 'JSON configuration data specific to each bonus type';

COMMIT;