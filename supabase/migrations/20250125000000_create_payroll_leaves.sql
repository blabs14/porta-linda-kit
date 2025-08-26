-- Migration: Create payroll_leaves table for managing special and parental leaves
-- This migration creates a comprehensive leave management system

BEGIN;

-- Create payroll_leaves table
CREATE TABLE "public"."payroll_leaves" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "family_id" uuid,
    "contract_id" uuid NOT NULL,
    "leave_type" text NOT NULL CHECK (leave_type IN (
        'maternity',           -- Licença de maternidade
        'paternity',           -- Licença de paternidade
        'parental',            -- Licença parental
        'adoption',            -- Licença por adoção
        'sick',                -- Baixa médica
        'family_assistance',   -- Assistência à família
        'bereavement',         -- Luto
        'marriage',            -- Casamento
        'study',               -- Formação/estudos
        'unpaid',              -- Licença sem vencimento
        'other'                -- Outras licenças especiais
    )),
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "total_days" integer NOT NULL,
    "paid_days" integer NOT NULL DEFAULT 0,
    "unpaid_days" integer NOT NULL DEFAULT 0,
    "percentage_paid" numeric(5,2) DEFAULT 100.00, -- Percentagem do salário pago
    "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
    "reason" text,
    "medical_certificate" boolean DEFAULT false,
    "supporting_documents" jsonb, -- URLs ou referências para documentos
    "notes" text,
    "approved_by" uuid, -- Referência ao utilizador que aprovou
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    
    CONSTRAINT "payroll_leaves_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payroll_leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "payroll_leaves_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."payroll_contracts"("id") ON DELETE CASCADE,
    CONSTRAINT "payroll_leaves_dates_check" CHECK ("end_date" >= "start_date"),
    CONSTRAINT "payroll_leaves_days_check" CHECK ("total_days" = "paid_days" + "unpaid_days"),
    CONSTRAINT "payroll_leaves_percentage_check" CHECK ("percentage_paid" >= 0 AND "percentage_paid" <= 100)
);

-- Enable RLS
ALTER TABLE "public"."payroll_leaves" ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX "payroll_leaves_user_id_idx" ON "public"."payroll_leaves"("user_id");
CREATE INDEX "payroll_leaves_contract_id_idx" ON "public"."payroll_leaves"("contract_id");
CREATE INDEX "payroll_leaves_dates_idx" ON "public"."payroll_leaves"("start_date", "end_date");
CREATE INDEX "payroll_leaves_type_status_idx" ON "public"."payroll_leaves"("leave_type", "status");

-- Create RLS policies
CREATE POLICY "Users can view their own leaves" ON "public"."payroll_leaves"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaves" ON "public"."payroll_leaves"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leaves" ON "public"."payroll_leaves"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leaves" ON "public"."payroll_leaves"
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically calculate total_days
CREATE OR REPLACE FUNCTION calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total days between start and end date (inclusive)
    NEW.total_days := (NEW.end_date - NEW.start_date) + 1;
    
    -- If paid_days and unpaid_days are not set, default to all paid
    IF NEW.paid_days = 0 AND NEW.unpaid_days = 0 THEN
        NEW.paid_days := NEW.total_days;
        NEW.unpaid_days := 0;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate days
CREATE TRIGGER trigger_calculate_leave_days
    BEFORE INSERT OR UPDATE ON "public"."payroll_leaves"
    FOR EACH ROW
    EXECUTE FUNCTION calculate_leave_days();

-- Create function to prevent overlapping leaves
CREATE OR REPLACE FUNCTION check_leave_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping leaves for the same contract
    IF EXISTS (
        SELECT 1 FROM "public"."payroll_leaves"
        WHERE contract_id = NEW.contract_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status IN ('approved', 'active')
        AND (
            (NEW.start_date <= start_date AND NEW.end_date >= start_date) OR
            (NEW.start_date <= end_date AND NEW.end_date >= end_date) OR
            (NEW.start_date >= start_date AND NEW.end_date <= end_date)
        )
    ) THEN
        RAISE EXCEPTION 'Leave period overlaps with existing approved leave for contract %', NEW.contract_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent overlapping leaves
CREATE TRIGGER trigger_check_leave_overlap
    BEFORE INSERT OR UPDATE ON "public"."payroll_leaves"
    FOR EACH ROW
    EXECUTE FUNCTION check_leave_overlap();

-- Add comments for documentation
COMMENT ON TABLE "public"."payroll_leaves" IS 'Manages all types of employee leaves including parental, sick, and special leaves';
COMMENT ON COLUMN "public"."payroll_leaves"."leave_type" IS 'Type of leave: maternity, paternity, parental, adoption, sick, family_assistance, bereavement, marriage, study, unpaid, other';
COMMENT ON COLUMN "public"."payroll_leaves"."percentage_paid" IS 'Percentage of salary paid during leave (0-100%)';
COMMENT ON COLUMN "public"."payroll_leaves"."supporting_documents" IS 'JSON array of document references or URLs';
COMMENT ON COLUMN "public"."payroll_leaves"."medical_certificate" IS 'Whether a medical certificate is required/provided';

COMMIT;

-- Success message
SELECT 'Payroll leaves table created successfully!' as message;