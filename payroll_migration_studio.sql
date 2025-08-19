-- Payroll Module Migration for Supabase Studio
-- Execute this SQL directly in the Supabase Studio SQL Editor
-- Creates tables for payroll, timesheets, and mileage tracking
-- All tables use RLS with user_id = auth.uid() policy

-- Create payroll_contracts table
create table if not exists "public"."payroll_contracts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "base_salary_cents" integer not null,
    "currency" text not null default 'EUR',
    "schedule_json" jsonb not null, -- {"monday": {"start": "09:00", "end": "18:00", "break_minutes": 60}, ...}
    "meal_allowance_cents_per_day" integer default 0,
    "meal_on_worked_days" boolean default true,
    "vacation_bonus_mode" text not null default 'monthly', -- 'monthly', 'june', 'december', 'off'
    "christmas_bonus_mode" text not null default 'monthly', -- 'monthly', 'december', 'off'
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_contracts_pkey" primary key ("id")
);

alter table "public"."payroll_contracts" enable row level security;

-- Create payroll_ot_policies table
create table if not exists "public"."payroll_ot_policies" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "contract_id" uuid not null,
    "name" text not null,
    "day_multiplier" numeric(4,2) not null default 1.25, -- 125% for day overtime
    "night_multiplier" numeric(4,2) not null default 1.50, -- 150% for night overtime
    "weekend_multiplier" numeric(4,2) not null default 1.50, -- 150% for weekend
    "holiday_multiplier" numeric(4,2) not null default 2.00, -- 200% for holidays
    "night_start" time not null default '22:00:00',
    "night_end" time not null default '07:00:00',
    "rounding_minutes" integer not null default 15, -- round to 15-minute blocks
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_ot_policies_pkey" primary key ("id")
);

alter table "public"."payroll_ot_policies" enable row level security;

-- Create payroll_holidays table
create table if not exists "public"."payroll_holidays" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "date" date not null,
    "name" text not null,
    "is_national" boolean default false,
    "created_at" timestamp with time zone default now(),
    constraint "payroll_holidays_pkey" primary key ("id")
);

alter table "public"."payroll_holidays" enable row level security;

-- Create payroll_time_entries table
create table if not exists "public"."payroll_time_entries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "contract_id" uuid not null,
    "date" date not null,
    "start_time" time not null,
    "end_time" time not null,
    "break_minutes" integer default 0,
    "description" text,
    "is_overtime" boolean default false,
    "is_night_shift" boolean default false,
    "is_weekend" boolean default false,
    "is_holiday" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_time_entries_pkey" primary key ("id")
);

alter table "public"."payroll_time_entries" enable row level security;

-- Create payroll_mileage_policies table
create table if not exists "public"."payroll_mileage_policies" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "contract_id" uuid not null,
    "name" text not null,
    "rate_cents_per_km" integer not null, -- cents per kilometer
    "max_km_per_month" integer,
    "requires_receipt" boolean default false,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_mileage_policies_pkey" primary key ("id")
);

alter table "public"."payroll_mileage_policies" enable row level security;

-- Create payroll_mileage_trips table
create table if not exists "public"."payroll_mileage_trips" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "policy_id" uuid not null,
    "date" date not null,
    "from_location" text not null,
    "to_location" text not null,
    "distance_km" numeric(8,2) not null,
    "purpose" text not null,
    "receipt_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_mileage_trips_pkey" primary key ("id")
);

alter table "public"."payroll_mileage_trips" enable row level security;

-- Create payroll_periods table
create table if not exists "public"."payroll_periods" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "contract_id" uuid not null,
    "year" integer not null,
    "month" integer not null,
    "status" text not null default 'draft', -- 'draft', 'calculated', 'approved', 'paid'
    "total_hours" numeric(8,2) default 0,
    "overtime_hours" numeric(8,2) default 0,
    "total_salary_cents" integer default 0,
    "overtime_pay_cents" integer default 0,
    "meal_allowance_cents" integer default 0,
    "mileage_pay_cents" integer default 0,
    "vacation_bonus_cents" integer default 0,
    "christmas_bonus_cents" integer default 0,
    "gross_pay_cents" integer default 0,
    "calculated_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "payroll_periods_pkey" primary key ("id")
);

alter table "public"."payroll_periods" enable row level security;

-- Create payroll_items table
create table if not exists "public"."payroll_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "period_id" uuid not null,
    "type" text not null, -- 'base_salary', 'overtime', 'meal_allowance', 'mileage', 'vacation_bonus', 'christmas_bonus'
    "description" text not null,
    "quantity" numeric(8,2) default 1,
    "rate_cents" integer not null,
    "amount_cents" integer not null,
    "created_at" timestamp with time zone default now(),
    constraint "payroll_items_pkey" primary key ("id")
);

alter table "public"."payroll_items" enable row level security;

-- Create payroll_payslips table
create table if not exists "public"."payroll_payslips" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "period_id" uuid not null,
    "payslip_data" jsonb not null, -- stores the complete payslip structure
    "pdf_url" text,
    "created_at" timestamp with time zone default now(),
    constraint "payroll_payslips_pkey" primary key ("id")
);

alter table "public"."payroll_payslips" enable row level security;

-- Add foreign key constraints
alter table "public"."payroll_ot_policies" 
    add constraint "payroll_ot_policies_contract_id_fkey" 
    foreign key ("contract_id") references "public"."payroll_contracts"("id") on delete cascade;

alter table "public"."payroll_time_entries" 
    add constraint "payroll_time_entries_contract_id_fkey" 
    foreign key ("contract_id") references "public"."payroll_contracts"("id") on delete cascade;

alter table "public"."payroll_mileage_policies" 
    add constraint "payroll_mileage_policies_contract_id_fkey" 
    foreign key ("contract_id") references "public"."payroll_contracts"("id") on delete cascade;

alter table "public"."payroll_mileage_trips" 
    add constraint "payroll_mileage_trips_policy_id_fkey" 
    foreign key ("policy_id") references "public"."payroll_mileage_policies"("id") on delete cascade;

alter table "public"."payroll_periods" 
    add constraint "payroll_periods_contract_id_fkey" 
    foreign key ("contract_id") references "public"."payroll_contracts"("id") on delete cascade;

alter table "public"."payroll_items" 
    add constraint "payroll_items_period_id_fkey" 
    foreign key ("period_id") references "public"."payroll_periods"("id") on delete cascade;

alter table "public"."payroll_payslips" 
    add constraint "payroll_payslips_period_id_fkey" 
    foreign key ("period_id") references "public"."payroll_periods"("id") on delete cascade;

-- Add check constraints
alter table "public"."payroll_contracts" 
    add constraint "payroll_contracts_base_salary_cents_check" 
    check ("base_salary_cents" > 0);

alter table "public"."payroll_contracts" 
    add constraint "payroll_contracts_vacation_bonus_mode_check" 
    check ("vacation_bonus_mode" in ('monthly', 'june', 'december', 'off'));

alter table "public"."payroll_contracts" 
    add constraint "payroll_contracts_christmas_bonus_mode_check" 
    check ("christmas_bonus_mode" in ('monthly', 'december', 'off'));

alter table "public"."payroll_ot_policies" 
    add constraint "payroll_ot_policies_multipliers_check" 
    check ("day_multiplier" >= 1.0 and "night_multiplier" >= 1.0 and "weekend_multiplier" >= 1.0 and "holiday_multiplier" >= 1.0);

alter table "public"."payroll_time_entries" 
    add constraint "payroll_time_entries_time_check" 
    check ("end_time" > "start_time");

alter table "public"."payroll_mileage_policies" 
    add constraint "payroll_mileage_policies_rate_check" 
    check ("rate_cents_per_km" > 0);

alter table "public"."payroll_mileage_trips" 
    add constraint "payroll_mileage_trips_distance_check" 
    check ("distance_km" > 0);

alter table "public"."payroll_periods" 
    add constraint "payroll_periods_month_check" 
    check ("month" between 1 and 12);

alter table "public"."payroll_periods" 
    add constraint "payroll_periods_status_check" 
    check ("status" in ('draft', 'calculated', 'approved', 'paid'));

alter table "public"."payroll_items" 
    add constraint "payroll_items_type_check" 
    check ("type" in ('base_salary', 'overtime', 'meal_allowance', 'mileage', 'vacation_bonus', 'christmas_bonus'));

-- Create indexes for performance
create index "payroll_contracts_user_id_idx" on "public"."payroll_contracts"("user_id");
create index "payroll_ot_policies_user_id_idx" on "public"."payroll_ot_policies"("user_id");
create index "payroll_ot_policies_contract_id_idx" on "public"."payroll_ot_policies"("contract_id");
create index "payroll_holidays_user_id_idx" on "public"."payroll_holidays"("user_id");
create index "payroll_holidays_date_idx" on "public"."payroll_holidays"("date");
create index "payroll_time_entries_user_id_idx" on "public"."payroll_time_entries"("user_id");
create index "payroll_time_entries_contract_id_idx" on "public"."payroll_time_entries"("contract_id");
create index "payroll_time_entries_date_idx" on "public"."payroll_time_entries"("date");
create index "payroll_mileage_policies_user_id_idx" on "public"."payroll_mileage_policies"("user_id");
create index "payroll_mileage_policies_contract_id_idx" on "public"."payroll_mileage_policies"("contract_id");
create index "payroll_mileage_trips_user_id_idx" on "public"."payroll_mileage_trips"("user_id");
create index "payroll_mileage_trips_policy_id_idx" on "public"."payroll_mileage_trips"("policy_id");
create index "payroll_mileage_trips_date_idx" on "public"."payroll_mileage_trips"("date");
create index "payroll_periods_user_id_idx" on "public"."payroll_periods"("user_id");
create index "payroll_periods_contract_id_idx" on "public"."payroll_periods"("contract_id");
create index "payroll_periods_year_month_idx" on "public"."payroll_periods"("year", "month");
create index "payroll_items_user_id_idx" on "public"."payroll_items"("user_id");
create index "payroll_items_period_id_idx" on "public"."payroll_items"("period_id");
create index "payroll_payslips_user_id_idx" on "public"."payroll_payslips"("user_id");
create index "payroll_payslips_period_id_idx" on "public"."payroll_payslips"("period_id");

-- Create unique constraints
create unique index "payroll_periods_contract_year_month_idx" on "public"."payroll_periods"("contract_id", "year", "month");
create unique index "payroll_payslips_period_id_idx_unique" on "public"."payroll_payslips"("period_id");

-- Create RLS policies
create policy "Users can view their own payroll contracts" on "public"."payroll_contracts"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll contracts" on "public"."payroll_contracts"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll contracts" on "public"."payroll_contracts"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll contracts" on "public"."payroll_contracts"
    for delete using (auth.uid() = user_id);

-- Apply similar RLS policies to all other tables
create policy "Users can view their own payroll ot policies" on "public"."payroll_ot_policies"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll ot policies" on "public"."payroll_ot_policies"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll ot policies" on "public"."payroll_ot_policies"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll ot policies" on "public"."payroll_ot_policies"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll holidays" on "public"."payroll_holidays"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll holidays" on "public"."payroll_holidays"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll holidays" on "public"."payroll_holidays"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll holidays" on "public"."payroll_holidays"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll time entries" on "public"."payroll_time_entries"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll time entries" on "public"."payroll_time_entries"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll time entries" on "public"."payroll_time_entries"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll time entries" on "public"."payroll_time_entries"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll mileage policies" on "public"."payroll_mileage_policies"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll mileage policies" on "public"."payroll_mileage_policies"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll mileage policies" on "public"."payroll_mileage_policies"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll mileage policies" on "public"."payroll_mileage_policies"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll mileage trips" on "public"."payroll_mileage_trips"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll mileage trips" on "public"."payroll_mileage_trips"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll mileage trips" on "public"."payroll_mileage_trips"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll mileage trips" on "public"."payroll_mileage_trips"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll periods" on "public"."payroll_periods"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll periods" on "public"."payroll_periods"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll periods" on "public"."payroll_periods"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll periods" on "public"."payroll_periods"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll items" on "public"."payroll_items"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll items" on "public"."payroll_items"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll items" on "public"."payroll_items"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll items" on "public"."payroll_items"
    for delete using (auth.uid() = user_id);

create policy "Users can view their own payroll payslips" on "public"."payroll_payslips"
    for select using (auth.uid() = user_id);

create policy "Users can insert their own payroll payslips" on "public"."payroll_payslips"
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own payroll payslips" on "public"."payroll_payslips"
    for update using (auth.uid() = user_id);

create policy "Users can delete their own payroll payslips" on "public"."payroll_payslips"
    for delete using (auth.uid() = user_id);

-- Add comments for documentation
comment on table "public"."payroll_contracts" is 'Employee contracts with salary and schedule information';
comment on table "public"."payroll_ot_policies" is 'Overtime policies with multipliers for different scenarios';
comment on table "public"."payroll_holidays" is 'Holiday calendar for payroll calculations';
comment on table "public"."payroll_time_entries" is 'Daily time entries for employees';
comment on table "public"."payroll_mileage_policies" is 'Mileage reimbursement policies';
comment on table "public"."payroll_mileage_trips" is 'Individual mileage trips for reimbursement';
comment on table "public"."payroll_periods" is 'Monthly payroll periods with calculated totals';
comment on table "public"."payroll_items" is 'Individual payroll line items for each period';
comment on table "public"."payroll_payslips" is 'Generated payslips with PDF storage';

-- Success message
select 'Payroll module tables created successfully!' as message;