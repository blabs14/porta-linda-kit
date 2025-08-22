-- Migration: Add weekly_hours to payroll_contracts and normalize currency
-- Safe, idempotent where possible

BEGIN;

-- Add weekly_hours column (nullable initially to avoid breaking existing rows)
ALTER TABLE public.payroll_contracts
  ADD COLUMN IF NOT EXISTS weekly_hours integer;

-- Backfill currency to 'EUR' where missing or empty (safety for older rows)
UPDATE public.payroll_contracts
SET currency = 'EUR'
WHERE currency IS NULL OR trim(currency) = '';

-- Optional: document the purpose of the new column
COMMENT ON COLUMN public.payroll_contracts.weekly_hours IS 'Weekly contracted hours (integer).';

COMMIT;