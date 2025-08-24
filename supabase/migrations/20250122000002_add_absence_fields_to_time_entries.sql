-- Migration: Add absence fields to payroll_time_entries
-- This migration adds is_holiday, is_sick, is_vacation, and is_exception columns to payroll_time_entries table

BEGIN;

-- Add absence-related columns to payroll_time_entries
ALTER TABLE public.payroll_time_entries 
  ADD COLUMN IF NOT EXISTS is_holiday boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sick boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vacation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exception boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_overtime boolean DEFAULT false;

-- Add description column if it doesn't exist (rename from notes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_time_entries' AND column_name = 'notes') THEN
    ALTER TABLE public.payroll_time_entries RENAME COLUMN notes TO description;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_time_entries' AND column_name = 'description') THEN
    ALTER TABLE public.payroll_time_entries ADD COLUMN description text;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.payroll_time_entries.is_holiday IS 'Indicates if this entry is for a public holiday';
COMMENT ON COLUMN public.payroll_time_entries.is_sick IS 'Indicates if this entry is for sick leave';
COMMENT ON COLUMN public.payroll_time_entries.is_vacation IS 'Indicates if this entry is for vacation/holiday leave';
COMMENT ON COLUMN public.payroll_time_entries.is_exception IS 'Indicates if this entry is an exception (allows time input for holidays/sick/vacation)';
COMMENT ON COLUMN public.payroll_time_entries.is_overtime IS 'Indicates if this entry includes overtime hours';

-- Add index for better query performance on absence types
CREATE INDEX IF NOT EXISTS idx_payroll_time_entries_absence_types 
  ON public.payroll_time_entries (user_id, date, is_holiday, is_sick, is_vacation);

COMMIT;

-- Success message
SELECT 'Absence fields added to payroll_time_entries successfully!' as message;