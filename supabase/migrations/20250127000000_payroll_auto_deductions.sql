-- Migration: Add automatic deduction calculation tables
-- Description: Creates tables for payroll deduction conditions and legal tables for automatic IRS/SS calculation

-- Table for storing deduction conditions per contract
CREATE TABLE IF NOT EXISTS payroll_deduction_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES payroll_contracts(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    region TEXT NOT NULL DEFAULT 'continente' CHECK (region IN ('continente', 'acores', 'madeira')),
    marital_status TEXT NOT NULL DEFAULT 'single' CHECK (marital_status IN ('single', 'married')),
    income_holders TEXT NOT NULL DEFAULT 'one' CHECK (income_holders IN ('one', 'two')),
    dependents INTEGER NOT NULL DEFAULT 0 CHECK (dependents >= 0),
    disability_worker BOOLEAN NOT NULL DEFAULT FALSE,
    disability_dependents BOOLEAN NOT NULL DEFAULT FALSE,
    residency TEXT NOT NULL DEFAULT 'resident' CHECK (residency IN ('resident', 'non_resident')),
    overtime_rule TEXT NOT NULL DEFAULT 'half_effective_rate' CHECK (overtime_rule IN ('half_effective_rate', 'none')),
    duodecimos BOOLEAN NOT NULL DEFAULT FALSE,
    meal_method TEXT NOT NULL DEFAULT 'card' CHECK (meal_method IN ('cash', 'card')),
    has_adse BOOLEAN NOT NULL DEFAULT FALSE,
    adse_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (adse_rate >= 0 AND adse_rate <= 1),
    union_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (union_rate >= 0 AND union_rate <= 1),
    auto_calculation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contract_id)
);

-- Table for storing versioned legal tables (IRS, SS rates, etc.)
CREATE TABLE IF NOT EXISTS legal_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    region TEXT NOT NULL DEFAULT 'continente' CHECK (region IN ('continente', 'acores', 'madeira')),
    domain TEXT NOT NULL CHECK (domain IN ('irs_withholding', 'ss_rates', 'meal_allowance_limits', 'overtime_rules')),
    payload JSONB NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, region, domain, effective_from)
);

-- Add RLS policies for payroll_deduction_conditions
ALTER TABLE payroll_deduction_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deduction conditions" ON payroll_deduction_conditions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deduction conditions" ON payroll_deduction_conditions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deduction conditions" ON payroll_deduction_conditions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deduction conditions" ON payroll_deduction_conditions
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for legal_tables (read-only for all authenticated users)
ALTER TABLE legal_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view legal tables" ON legal_tables
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow admin users to modify legal tables (for now, restrict to service role)
CREATE POLICY "Only service role can modify legal tables" ON legal_tables
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_deduction_conditions_user_contract 
    ON payroll_deduction_conditions(user_id, contract_id);

CREATE INDEX IF NOT EXISTS idx_payroll_deduction_conditions_year 
    ON payroll_deduction_conditions(year);

CREATE INDEX IF NOT EXISTS idx_legal_tables_lookup 
    ON legal_tables(year, region, domain, effective_from);

CREATE INDEX IF NOT EXISTS idx_legal_tables_effective_dates 
    ON legal_tables(effective_from, effective_to);

-- Add updated_at trigger for payroll_deduction_conditions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payroll_deduction_conditions_updated_at 
    BEFORE UPDATE ON payroll_deduction_conditions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_tables_updated_at 
    BEFORE UPDATE ON legal_tables 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add column to existing payroll_contracts table to track auto calculation preference
ALTER TABLE payroll_contracts 
ADD COLUMN IF NOT EXISTS auto_deductions_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_payroll_contracts_auto_deductions 
    ON payroll_contracts(auto_deductions_enabled);

COMMIT;