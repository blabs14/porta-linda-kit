-- Add holiday_type column to payroll_holidays table
-- This migration adds support for different types of holidays: national, regional, municipal, company, personal

ALTER TABLE "public"."payroll_holidays"
ADD COLUMN IF NOT EXISTS "holiday_type" text DEFAULT 'company';

-- Add check constraint to ensure valid holiday types
ALTER TABLE "public"."payroll_holidays"
ADD CONSTRAINT "payroll_holidays_holiday_type_valid" 
CHECK (holiday_type IN ('national', 'regional', 'municipal', 'company', 'personal'));

-- Add comment to explain the column
COMMENT ON COLUMN "public"."payroll_holidays"."holiday_type" IS 'Type of holiday: national (public holidays), regional (regional holidays), municipal (municipal holidays), company (company-specific holidays), personal (personal holidays)';

-- Update existing records to have a default type
UPDATE "public"."payroll_holidays" 
SET "holiday_type" = 'company' 
WHERE "holiday_type" IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE "public"."payroll_holidays"
ALTER COLUMN "holiday_type" SET NOT NULL;