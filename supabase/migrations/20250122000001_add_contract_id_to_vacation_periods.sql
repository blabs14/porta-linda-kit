-- Migration: Add contract_id to payroll_vacation_periods
-- This migration adds contract_id column to payroll_vacation_periods table
-- and implements constraints to prevent overlapping vacation periods within the same contract

-- Step 1: Add contract_id column (nullable initially for backfill)
ALTER TABLE payroll_vacation_periods 
ADD COLUMN contract_id UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE payroll_vacation_periods 
ADD CONSTRAINT fk_payroll_vacation_periods_contract_id 
FOREIGN KEY (contract_id) REFERENCES payroll_contracts(id) ON DELETE CASCADE;

-- Step 3: Backfill contract_id with the most recent active contract for each user
-- If multiple contracts are active today, choose the one with the most recent start_date
WITH user_contracts AS (
  SELECT DISTINCT 
    pvp.user_id,
    pc.id as contract_id,
    pc.start_date,
    ROW_NUMBER() OVER (
      PARTITION BY pvp.user_id 
      ORDER BY pc.start_date DESC
    ) as rn
  FROM payroll_vacation_periods pvp
  JOIN payroll_contracts pc ON pc.user_id = pvp.user_id
  WHERE pvp.contract_id IS NULL
    AND pc.start_date <= CURRENT_DATE
    AND (pc.end_date IS NULL OR pc.end_date >= CURRENT_DATE)
)
UPDATE payroll_vacation_periods 
SET contract_id = uc.contract_id
FROM user_contracts uc
WHERE payroll_vacation_periods.user_id = uc.user_id
  AND payroll_vacation_periods.contract_id IS NULL
  AND uc.rn = 1;

-- Step 4: Handle cases where no active contract exists - use the most recent contract
WITH user_contracts AS (
  SELECT DISTINCT 
    pvp.user_id,
    pc.id as contract_id,
    pc.start_date,
    ROW_NUMBER() OVER (
      PARTITION BY pvp.user_id 
      ORDER BY pc.start_date DESC
    ) as rn
  FROM payroll_vacation_periods pvp
  JOIN payroll_contracts pc ON pc.user_id = pvp.user_id
  WHERE pvp.contract_id IS NULL
)
UPDATE payroll_vacation_periods 
SET contract_id = uc.contract_id
FROM user_contracts uc
WHERE payroll_vacation_periods.user_id = uc.user_id
  AND payroll_vacation_periods.contract_id IS NULL
  AND uc.rn = 1;

-- Step 5: Make contract_id NOT NULL
ALTER TABLE payroll_vacation_periods 
ALTER COLUMN contract_id SET NOT NULL;

-- Step 6: Create composite index for efficient queries
CREATE INDEX idx_payroll_vacation_periods_user_contract_dates 
ON payroll_vacation_periods (user_id, contract_id, start_date, end_date);

-- Step 7: Create function to check for overlapping vacation periods within the same contract
CREATE OR REPLACE FUNCTION check_vacation_period_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping periods within the same contract
  IF EXISTS (
    SELECT 1 
    FROM payroll_vacation_periods 
    WHERE user_id = NEW.user_id 
      AND contract_id = NEW.contract_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_date >= start_date AND NEW.start_date <= end_date) OR
        (NEW.end_date >= start_date AND NEW.end_date <= end_date) OR
        (NEW.start_date <= start_date AND NEW.end_date >= end_date)
      )
  ) THEN
    RAISE EXCEPTION 'Vacation period overlaps with existing period for the same contract. User: %, Contract: %, Period: % to %', 
      NEW.user_id, NEW.contract_id, NEW.start_date, NEW.end_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to prevent overlapping vacation periods
CREATE TRIGGER trigger_check_vacation_period_overlap
  BEFORE INSERT OR UPDATE ON payroll_vacation_periods
  FOR EACH ROW
  EXECUTE FUNCTION check_vacation_period_overlap();

-- Step 9: Add comment to document the constraint
COMMENT ON TRIGGER trigger_check_vacation_period_overlap ON payroll_vacation_periods IS 
'Prevents overlapping vacation periods within the same contract for a user. Overlaps between different contracts are allowed.';

COMMENT ON COLUMN payroll_vacation_periods.contract_id IS 
'References the payroll contract this vacation period belongs to. Required field.';