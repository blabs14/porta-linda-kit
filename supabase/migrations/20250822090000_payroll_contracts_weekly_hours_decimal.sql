-- Migration: Change weekly_hours to numeric(4,2) to support decimal weekly hours
-- Safe conversion with USING cast; keep NULLs; add permissive CHECK; update comment

BEGIN;

-- Alter column type from integer to numeric(4,2)
ALTER TABLE public.payroll_contracts
  ALTER COLUMN weekly_hours TYPE numeric(4,2)
  USING weekly_hours::numeric;

-- Add a permissive check constraint (allow NULL for legacy rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payroll_contracts_weekly_hours_range_chk'
  ) THEN
    ALTER TABLE public.payroll_contracts
      ADD CONSTRAINT payroll_contracts_weekly_hours_range_chk
      CHECK (
        weekly_hours IS NULL OR (weekly_hours >= 0.5 AND weekly_hours <= 60)
      );
  END IF;
END $$;

-- Update column comment
COMMENT ON COLUMN public.payroll_contracts.weekly_hours IS 'Weekly contracted hours, numeric(4,2), allows half-hours (e.g., 37.5).';

COMMIT;