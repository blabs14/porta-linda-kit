-- Create subsidy_configs table for payroll subsidies
-- This table stores configuration for vacation and christmas subsidies

create table "public"."subsidy_configs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "contract_id" uuid not null,
    "type" text not null, -- 'vacation' or 'christmas'
    "enabled" boolean not null default true,
    "payment_method" text not null default 'monthly', -- 'monthly', 'lump_sum', 'advance_and_balance'
    "payment_month" integer, -- month for lump sum payments (1-12)
    "advance_percentage" numeric(5,2), -- percentage for advance payments (0-100)
    "vacation_days_entitled" integer, -- for vacation subsidy only
    "vacation_days_taken" integer, -- for vacation subsidy only
    "reference_salary_months" integer default 12, -- for christmas subsidy (usually 12)
    "proportional_calculation" boolean default true, -- calculate proportionally based on worked months
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);

-- Enable RLS
alter table "public"."subsidy_configs" enable row level security;

-- Add primary key
alter table "public"."subsidy_configs" add constraint "subsidy_configs_pkey" primary key ("id");

-- Add unique constraint to prevent duplicate configs
alter table "public"."subsidy_configs" add constraint "subsidy_configs_user_contract_type_unique" 
    unique ("user_id", "contract_id", "type");

-- Add foreign key constraints
alter table "public"."subsidy_configs" add constraint "subsidy_configs_user_id_fkey" 
    foreign key ("user_id") references "auth"."users" ("id") on delete cascade;

alter table "public"."subsidy_configs" add constraint "subsidy_configs_contract_id_fkey" 
    foreign key ("contract_id") references "public"."payroll_contracts" ("id") on delete cascade;

-- Add check constraints
alter table "public"."subsidy_configs" add constraint "subsidy_configs_type_valid" 
    check ("type" in ('vacation', 'christmas'));

alter table "public"."subsidy_configs" add constraint "subsidy_configs_payment_method_valid" 
    check ("payment_method" in ('monthly', 'lump_sum', 'advance_and_balance'));

alter table "public"."subsidy_configs" add constraint "subsidy_configs_payment_month_valid" 
    check ("payment_month" is null or ("payment_month" >= 1 and "payment_month" <= 12));

alter table "public"."subsidy_configs" add constraint "subsidy_configs_advance_percentage_valid" 
    check ("advance_percentage" is null or ("advance_percentage" >= 0 and "advance_percentage" <= 100));

alter table "public"."subsidy_configs" add constraint "subsidy_configs_vacation_days_valid" 
    check ("vacation_days_entitled" is null or "vacation_days_entitled" >= 0);

alter table "public"."subsidy_configs" add constraint "subsidy_configs_vacation_days_taken_valid" 
    check ("vacation_days_taken" is null or "vacation_days_taken" >= 0);

alter table "public"."subsidy_configs" add constraint "subsidy_configs_reference_salary_months_valid" 
    check ("reference_salary_months" is null or ("reference_salary_months" >= 1 and "reference_salary_months" <= 12));

-- Create RLS policies
CREATE POLICY "Users can view own subsidy configs" ON "public"."subsidy_configs"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subsidy configs" ON "public"."subsidy_configs"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subsidy configs" ON "public"."subsidy_configs"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subsidy configs" ON "public"."subsidy_configs"
    FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
create index "subsidy_configs_user_id_idx" on "public"."subsidy_configs" ("user_id");
create index "subsidy_configs_contract_id_idx" on "public"."subsidy_configs" ("contract_id");
create index "subsidy_configs_type_idx" on "public"."subsidy_configs" ("type");

-- Add comments for documentation
COMMENT ON TABLE "public"."subsidy_configs" IS 'Configuration for vacation and christmas subsidies per contract';
COMMENT ON COLUMN "public"."subsidy_configs"."type" IS 'Type of subsidy: vacation or christmas';
COMMENT ON COLUMN "public"."subsidy_configs"."payment_method" IS 'How the subsidy is paid: monthly, lump_sum, or advance_and_balance';
COMMENT ON COLUMN "public"."subsidy_configs"."payment_month" IS 'Month for lump sum payments (1=January, 12=December)';
COMMENT ON COLUMN "public"."subsidy_configs"."advance_percentage" IS 'Percentage paid as advance (0-100%)';
COMMENT ON COLUMN "public"."subsidy_configs"."vacation_days_entitled" IS 'Total vacation days entitled per year (vacation subsidy only)';
COMMENT ON COLUMN "public"."subsidy_configs"."vacation_days_taken" IS 'Vacation days already taken (vacation subsidy only)';
COMMENT ON COLUMN "public"."subsidy_configs"."reference_salary_months" IS 'Number of months to use for christmas subsidy calculation (usually 12)';
COMMENT ON COLUMN "public"."subsidy_configs"."proportional_calculation" IS 'Whether to calculate subsidy proportionally based on worked months';