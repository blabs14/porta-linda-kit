alter table "public"."family_members" drop constraint "family_members_invited_by_fkey";

alter table "public"."family_members" drop constraint "family_members_user_id_fkey";

alter table "public"."goal_allocations" drop constraint "goal_allocations_transaction_id_fkey";

alter table "public"."goals" drop constraint "goals_user_id_fkey";

alter table "public"."profiles" drop constraint "profiles_id_fkey";

alter table "public"."transactions" drop constraint "transactions_user_id_fkey";

alter table "public"."accounts" drop constraint "accounts_user_id_fkey";

alter table "public"."transactions" drop constraint "transactions_account_id_fkey";

alter table "public"."transactions" drop constraint "transactions_categoria_id_fkey";

create table "public"."debug_logs" (
    "id" uuid not null default gen_random_uuid(),
    "operation" text not null,
    "table_name" text not null,
    "user_id" uuid,
    "result" boolean not null,
    "details" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."debug_logs" enable row level security;

create table "public"."family_backups" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "created_by" uuid not null,
    "backup_type" text not null default 'full'::text,
    "status" text not null default 'pending'::text,
    "file_path" text,
    "file_size" bigint,
    "metadata" jsonb default '{}'::jsonb,
    "error_message" text,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone default (now() + '1 year'::interval)
);


alter table "public"."family_backups" enable row level security;

create table "public"."family_invites" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "email" character varying(255) not null,
    "role" character varying(20) not null default 'member'::character varying,
    "status" character varying(20) not null default 'pending'::character varying,
    "invited_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone not null,
    "token" character varying(255) default encode(gen_random_bytes(32), 'hex'::text),
    "accepted_at" timestamp with time zone
);


create table "public"."fixed_expenses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "nome" text not null,
    "valor" numeric(10,2) not null,
    "dia_vencimento" integer not null,
    "categoria_id" uuid not null,
    "ativa" boolean default true,
    "created_at" timestamp with time zone default now()
);


alter table "public"."fixed_expenses" enable row level security;

create table "public"."report_templates" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" character varying(255) not null,
    "layout" jsonb not null default '{}'::jsonb,
    "styling" jsonb not null default '{}'::jsonb,
    "custom_fields" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."report_templates" enable row level security;

create table "public"."scheduled_exports" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" character varying(255) not null,
    "schedule" character varying(20) not null,
    "time" time without time zone not null,
    "day_of_week" integer,
    "day_of_month" integer,
    "options" jsonb not null,
    "email" character varying(255) not null,
    "active" boolean default true,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."scheduled_exports" enable row level security;

alter table "public"."families" drop column "name";

alter table "public"."families" add column "description" text;

alter table "public"."families" add column "nome" character varying(100) not null;

alter table "public"."families" add column "settings" jsonb default '{"allow_view_all": true, "require_approval": false, "allow_add_transactions": true}'::jsonb;

alter table "public"."families" disable row level security;

alter table "public"."family_members" drop column "invited_by";

alter table "public"."family_members" add column "permissions" text[] default ARRAY['view_transactions'::text];

alter table "public"."family_members" alter column "role" set default 'member'::character varying;

alter table "public"."family_members" alter column "role" set not null;

alter table "public"."family_members" alter column "role" set data type character varying(20) using "role"::character varying(20);

alter table "public"."family_members" disable row level security;

alter table "public"."goal_allocations" drop column "transaction_id";

alter table "public"."goal_allocations" add column "account_id" uuid not null;

alter table "public"."goal_allocations" add column "data_alocacao" date not null default CURRENT_DATE;

alter table "public"."goal_allocations" add column "descricao" text;

alter table "public"."goal_allocations" add column "updated_at" timestamp with time zone default now();

alter table "public"."goal_allocations" add column "user_id" uuid not null;

alter table "public"."goals" drop column "data_objetivo";

alter table "public"."goals" add column "account_id" uuid;

alter table "public"."goals" add column "ativa" boolean default true;

alter table "public"."goals" add column "prazo" date;

alter table "public"."goals" add column "status" character varying(16) default 'active'::character varying;

alter table "public"."goals" add column "valor_meta" numeric(10,2);

alter table "public"."goals" alter column "valor_atual" set default 0;

alter table "public"."goals" alter column "valor_atual" set data type numeric(10,2) using "valor_atual"::numeric(10,2);

alter table "public"."goals" alter column "valor_objetivo" set default 0;

alter table "public"."goals" alter column "valor_objetivo" set data type numeric(10,2) using "valor_objetivo"::numeric(10,2);

alter table "public"."notifications" drop column "lida";

alter table "public"."notifications" drop column "mensagem";

alter table "public"."notifications" drop column "tipo";

alter table "public"."notifications" drop column "titulo";

alter table "public"."notifications" add column "category" text default 'system'::text;

alter table "public"."notifications" add column "message" text not null;

alter table "public"."notifications" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."notifications" add column "read" boolean default false;

alter table "public"."notifications" add column "title" text not null;

alter table "public"."notifications" add column "type" text not null default 'info'::text;

alter table "public"."notifications" add column "updated_at" timestamp with time zone default now();

alter table "public"."profiles" drop column "avatar_url";

alter table "public"."profiles" drop column "family_id";

alter table "public"."profiles" drop column "full_name";

alter table "public"."profiles" drop column "username";

alter table "public"."profiles" drop column "website";

alter table "public"."profiles" add column "birth_date" date;

alter table "public"."profiles" add column "created_at" timestamp with time zone default now();

alter table "public"."profiles" add column "first_name" text;

alter table "public"."profiles" add column "foto_url" text;

alter table "public"."profiles" add column "last_name" text;

alter table "public"."profiles" add column "nome" text not null;

alter table "public"."profiles" add column "percentual_divisao" numeric(5,2) default 50.00;

alter table "public"."profiles" add column "personal_settings" jsonb default '{"theme": "system", "appearance": {"theme": "system", "compact_mode": false, "show_currency_symbol": true}, "notifications": {"push": true, "email": true, "budget_alerts": true, "goal_reminders": true, "transaction_alerts": false}}'::jsonb;

alter table "public"."profiles" add column "phone" text;

alter table "public"."profiles" add column "poupanca_mensal" numeric(10,2) default 0;

alter table "public"."profiles" add column "user_id" uuid not null;

alter table "public"."profiles" alter column "id" set default gen_random_uuid();

alter table "public"."profiles" alter column "updated_at" set default now();

alter table "public"."transactions" add column "goal_id" uuid;

alter table "public"."transactions" alter column "descricao" drop not null;

alter table "public"."transactions" alter column "descricao" set data type character varying(255) using "descricao"::character varying(255);

alter table "public"."transactions" alter column "valor" set data type numeric(10,2) using "valor"::numeric(10,2);

CREATE INDEX budgets_categoria_id_idx ON public.budgets USING btree (categoria_id);

CREATE INDEX budgets_mes_idx ON public.budgets USING btree (mes);

CREATE INDEX budgets_user_id_idx ON public.budgets USING btree (user_id);

CREATE INDEX budgets_user_mes_idx ON public.budgets USING btree (user_id, mes);

CREATE UNIQUE INDEX categories_nome_user_id_key ON public.categories USING btree (nome, user_id);

CREATE UNIQUE INDEX debug_logs_pkey ON public.debug_logs USING btree (id);

CREATE UNIQUE INDEX family_backups_pkey ON public.family_backups USING btree (id);

CREATE UNIQUE INDEX family_invites_pkey ON public.family_invites USING btree (id);

CREATE UNIQUE INDEX family_invites_token_key ON public.family_invites USING btree (token);

CREATE UNIQUE INDEX family_members_user_id_family_id_key ON public.family_members USING btree (user_id, family_id);

CREATE UNIQUE INDEX fixed_expenses_pkey ON public.fixed_expenses USING btree (id);

CREATE INDEX idx_accounts_family_id ON public.accounts USING btree (family_id);

CREATE INDEX idx_accounts_family_type ON public.accounts USING btree (family_id, tipo) WHERE (family_id IS NOT NULL);

CREATE INDEX idx_accounts_user_family_created ON public.accounts USING btree (user_id, family_id, created_at DESC);

CREATE INDEX idx_accounts_user_id_family_id ON public.accounts USING btree (user_id, family_id);

CREATE INDEX idx_accounts_user_type ON public.accounts USING btree (user_id, tipo);

CREATE INDEX idx_budgets_family_id ON public.budgets USING btree (family_id);

CREATE INDEX idx_categories_family_id ON public.categories USING btree (family_id);

CREATE INDEX idx_categories_family_type ON public.categories USING btree (family_id, nome) WHERE (family_id IS NOT NULL);

CREATE INDEX idx_categories_user_family_created ON public.categories USING btree (user_id, family_id, created_at DESC);

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);

CREATE INDEX idx_categories_user_type ON public.categories USING btree (user_id, nome) WHERE (family_id IS NULL);

CREATE INDEX idx_families_created_by ON public.families USING btree (created_by);

CREATE INDEX idx_family_backups_created_at ON public.family_backups USING btree (created_at);

CREATE INDEX idx_family_backups_expires_at ON public.family_backups USING btree (expires_at);

CREATE INDEX idx_family_backups_family_id ON public.family_backups USING btree (family_id);

CREATE INDEX idx_family_backups_status ON public.family_backups USING btree (status);

CREATE INDEX idx_family_invites_created_at ON public.family_invites USING btree (created_at DESC);

CREATE INDEX idx_family_invites_email ON public.family_invites USING btree (email);

CREATE INDEX idx_family_invites_email_status ON public.family_invites USING btree (email, status);

CREATE INDEX idx_family_invites_family_id ON public.family_invites USING btree (family_id);

CREATE INDEX idx_family_invites_invited_by ON public.family_invites USING btree (invited_by);

CREATE INDEX idx_family_invites_pending ON public.family_invites USING btree (family_id, status, created_at) WHERE ((status)::text = 'pending'::text);

CREATE INDEX idx_family_invites_status ON public.family_invites USING btree (status);

CREATE INDEX idx_family_invites_token ON public.family_invites USING btree (token);

CREATE INDEX idx_family_members_family_id ON public.family_members USING btree (family_id);

CREATE INDEX idx_family_members_family_id_user_id ON public.family_members USING btree (family_id, user_id);

CREATE INDEX idx_family_members_family_role ON public.family_members USING btree (family_id, role, joined_at);

CREATE INDEX idx_family_members_joined_at ON public.family_members USING btree (joined_at DESC);

CREATE INDEX idx_family_members_user_id ON public.family_members USING btree (user_id);

CREATE INDEX idx_fixed_expenses_categoria_id ON public.fixed_expenses USING btree (categoria_id);

CREATE INDEX idx_fixed_expenses_user_id ON public.fixed_expenses USING btree (user_id);

CREATE INDEX idx_goal_allocations_account_id ON public.goal_allocations USING btree (account_id);

CREATE INDEX idx_goal_allocations_data_alocacao ON public.goal_allocations USING btree (data_alocacao);

CREATE INDEX idx_goal_allocations_goal_id ON public.goal_allocations USING btree (goal_id);

CREATE INDEX idx_goal_allocations_user_id ON public.goal_allocations USING btree (user_id);

CREATE INDEX idx_goals_account_id ON public.goals USING btree (account_id);

CREATE INDEX idx_goals_active_status ON public.goals USING btree (ativa, status) WHERE ((ativa = true) AND ((status)::text = 'active'::text));

CREATE INDEX idx_goals_family_status ON public.goals USING btree (family_id, status, prazo) WHERE ((family_id IS NOT NULL) AND (ativa = true));

CREATE INDEX idx_goals_user_id ON public.goals USING btree (user_id);

CREATE INDEX idx_goals_user_status ON public.goals USING btree (user_id, status, prazo) WHERE (ativa = true);

CREATE INDEX idx_notifications_category ON public.notifications USING btree (category);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_family_id ON public.notifications USING btree (family_id);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_report_templates_created_at ON public.report_templates USING btree (created_at);

CREATE INDEX idx_report_templates_user_id ON public.report_templates USING btree (user_id);

CREATE INDEX idx_scheduled_exports_active ON public.scheduled_exports USING btree (active);

CREATE INDEX idx_scheduled_exports_next_run ON public.scheduled_exports USING btree (next_run);

CREATE INDEX idx_scheduled_exports_user_id ON public.scheduled_exports USING btree (user_id);

CREATE INDEX idx_transactions_account_date ON public.transactions USING btree (account_id, data DESC);

CREATE INDEX idx_transactions_account_id ON public.transactions USING btree (account_id);

CREATE INDEX idx_transactions_account_id_tipo_valor ON public.transactions USING btree (account_id, tipo, valor);

CREATE INDEX idx_transactions_account_type ON public.transactions USING btree (account_id, tipo) WHERE (account_id IS NOT NULL);

CREATE INDEX idx_transactions_categoria_id ON public.transactions USING btree (categoria_id);

CREATE INDEX idx_transactions_category_date ON public.transactions USING btree (categoria_id, data DESC);

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);

CREATE INDEX idx_transactions_family_date ON public.transactions USING btree (family_id, data DESC);

CREATE INDEX idx_transactions_family_date_created ON public.transactions USING btree (family_id, data DESC, created_at DESC) WHERE (family_id IS NOT NULL);

CREATE INDEX idx_transactions_family_id ON public.transactions USING btree (family_id);

CREATE INDEX idx_transactions_goal_id ON public.transactions USING btree (goal_id);

CREATE INDEX idx_transactions_recent ON public.transactions USING btree (user_id, data DESC, valor);

CREATE INDEX idx_transactions_type_date ON public.transactions USING btree (tipo, data DESC);

CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, data DESC);

CREATE INDEX idx_transactions_user_date_created ON public.transactions USING btree (user_id, data DESC, created_at DESC) WHERE (family_id IS NULL);

CREATE INDEX idx_transactions_user_date_type ON public.transactions USING btree (user_id, data DESC, tipo);

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);

CREATE INDEX idx_transactions_user_monthly ON public.transactions USING btree (user_id, data, tipo, valor) WHERE (family_id IS NULL);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX profiles_user_id_unique ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX report_templates_pkey ON public.report_templates USING btree (id);

CREATE UNIQUE INDEX scheduled_exports_pkey ON public.scheduled_exports USING btree (id);

alter table "public"."debug_logs" add constraint "debug_logs_pkey" PRIMARY KEY using index "debug_logs_pkey";

alter table "public"."family_backups" add constraint "family_backups_pkey" PRIMARY KEY using index "family_backups_pkey";

alter table "public"."family_invites" add constraint "family_invites_pkey" PRIMARY KEY using index "family_invites_pkey";

alter table "public"."fixed_expenses" add constraint "fixed_expenses_pkey" PRIMARY KEY using index "fixed_expenses_pkey";

alter table "public"."report_templates" add constraint "report_templates_pkey" PRIMARY KEY using index "report_templates_pkey";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_pkey" PRIMARY KEY using index "scheduled_exports_pkey";

alter table "public"."accounts" add constraint "accounts_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) not valid;

alter table "public"."accounts" validate constraint "accounts_family_id_fkey";

alter table "public"."accounts" add constraint "accounts_tipo_check" CHECK ((tipo = ANY (ARRAY['corrente'::text, 'poupança'::text, 'investimento'::text, 'outro'::text, 'cartão de crédito'::text]))) not valid;

alter table "public"."accounts" validate constraint "accounts_tipo_check";

alter table "public"."budgets" add constraint "budgets_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE not valid;

alter table "public"."budgets" validate constraint "budgets_family_id_fkey";

alter table "public"."budgets" add constraint "budgets_mes_check" CHECK (((mes)::text ~ '^\d{4}-\d{2}$'::text)) not valid;

alter table "public"."budgets" validate constraint "budgets_mes_check";

alter table "public"."budgets" add constraint "budgets_valor_check" CHECK ((valor > (0)::numeric)) not valid;

alter table "public"."budgets" validate constraint "budgets_valor_check";

alter table "public"."categories" add constraint "categories_nome_user_id_key" UNIQUE using index "categories_nome_user_id_key";

alter table "public"."family_backups" add constraint "family_backups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."family_backups" validate constraint "family_backups_created_by_fkey";

alter table "public"."family_backups" add constraint "family_backups_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE not valid;

alter table "public"."family_backups" validate constraint "family_backups_family_id_fkey";

alter table "public"."family_backups" add constraint "family_backups_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."family_backups" validate constraint "family_backups_status_check";

alter table "public"."family_backups" add constraint "family_backups_type_check" CHECK ((backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'selective'::text]))) not valid;

alter table "public"."family_backups" validate constraint "family_backups_type_check";

alter table "public"."family_invites" add constraint "family_invites_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE not valid;

alter table "public"."family_invites" validate constraint "family_invites_family_id_fkey";

alter table "public"."family_invites" add constraint "family_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."family_invites" validate constraint "family_invites_invited_by_fkey";

alter table "public"."family_invites" add constraint "family_invites_role_check" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))) not valid;

alter table "public"."family_invites" validate constraint "family_invites_role_check";

alter table "public"."family_invites" add constraint "family_invites_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[]))) not valid;

alter table "public"."family_invites" validate constraint "family_invites_status_check";

alter table "public"."family_invites" add constraint "family_invites_token_key" UNIQUE using index "family_invites_token_key";

alter table "public"."family_members" add constraint "family_members_role_check" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))) not valid;

alter table "public"."family_members" validate constraint "family_members_role_check";

alter table "public"."family_members" add constraint "family_members_user_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."family_members" validate constraint "family_members_user_fkey";

alter table "public"."family_members" add constraint "family_members_user_id_family_id_key" UNIQUE using index "family_members_user_id_family_id_key";

alter table "public"."family_members" add constraint "fk_family_members_user" FOREIGN KEY (user_id) REFERENCES profiles(user_id) not valid;

alter table "public"."family_members" validate constraint "fk_family_members_user";

alter table "public"."fixed_expenses" add constraint "fixed_expenses_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categories(id) not valid;

alter table "public"."fixed_expenses" validate constraint "fixed_expenses_categoria_id_fkey";

alter table "public"."fixed_expenses" add constraint "fixed_expenses_dia_vencimento_check" CHECK (((dia_vencimento >= 1) AND (dia_vencimento <= 31))) not valid;

alter table "public"."fixed_expenses" validate constraint "fixed_expenses_dia_vencimento_check";

alter table "public"."goal_allocations" add constraint "goal_allocations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."goal_allocations" validate constraint "goal_allocations_account_id_fkey";

alter table "public"."goal_allocations" add constraint "goal_allocations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."goal_allocations" validate constraint "goal_allocations_user_id_fkey";

alter table "public"."goal_allocations" add constraint "goal_allocations_valor_check" CHECK ((valor > (0)::numeric)) not valid;

alter table "public"."goal_allocations" validate constraint "goal_allocations_valor_check";

alter table "public"."goals" add constraint "goals_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."goals" validate constraint "goals_account_id_fkey";

alter table "public"."goals" add constraint "goals_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) not valid;

alter table "public"."goals" validate constraint "goals_family_id_fkey";

alter table "public"."goals" add constraint "goals_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."goals" validate constraint "goals_status_check";

alter table "public"."notifications" add constraint "notifications_category_check" CHECK ((category = ANY (ARRAY['invite'::text, 'member'::text, 'transaction'::text, 'budget'::text, 'goal'::text, 'system'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_category_check";

alter table "public"."notifications" add constraint "notifications_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_family_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."report_templates" add constraint "report_templates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."report_templates" validate constraint "report_templates_user_id_fkey";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_day_of_month_check" CHECK (((day_of_month >= 1) AND (day_of_month <= 31))) not valid;

alter table "public"."scheduled_exports" validate constraint "scheduled_exports_day_of_month_check";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_day_of_week_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6))) not valid;

alter table "public"."scheduled_exports" validate constraint "scheduled_exports_day_of_week_check";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_schedule_check" CHECK (((schedule)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))) not valid;

alter table "public"."scheduled_exports" validate constraint "scheduled_exports_schedule_check";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."scheduled_exports" validate constraint "scheduled_exports_user_id_fkey";

alter table "public"."transactions" add constraint "transactions_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) not valid;

alter table "public"."transactions" validate constraint "transactions_family_id_fkey";

alter table "public"."transactions" add constraint "transactions_goal_id_fkey" FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL not valid;

alter table "public"."transactions" validate constraint "transactions_goal_id_fkey";

alter table "public"."transactions" add constraint "transactions_tipo_check" CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text, 'transferencia'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_tipo_check";

alter table "public"."transactions" add constraint "transactions_valor_min" CHECK ((valor >= 0.01)) not valid;

alter table "public"."transactions" validate constraint "transactions_valor_min";

alter table "public"."accounts" add constraint "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_user_id_fkey";

alter table "public"."transactions" add constraint "transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."transactions" validate constraint "transactions_account_id_fkey";

alter table "public"."transactions" add constraint "transactions_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categories(id) not valid;

alter table "public"."transactions" validate constraint "transactions_categoria_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_family_invite(invite_token text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    invite_record family_invites;
    new_member_id UUID;
BEGIN
    SET search_path = public, pg_temp;
    SELECT * INTO invite_record
    FROM family_invites
    WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Convite inválido ou expirado');
    END IF;
    IF EXISTS (
        SELECT 1 FROM family_members 
        WHERE family_id = invite_record.family_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Já é membro desta família');
    END IF;
    INSERT INTO family_members (user_id, family_id, role)
    VALUES (auth.uid(), invite_record.family_id, invite_record.role)
    RETURNING id INTO new_member_id;
    UPDATE family_invites
    SET status = 'accepted'
    WHERE id = invite_record.id;
    RETURN JSON_BUILD_OBJECT(
        'success', true, 
        'message', 'Convite aceito com sucesso',
        'family_id', invite_record.family_id,
        'member_id', new_member_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_family_invite_by_email(p_invite_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_email text;
  v_invite record;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter email do utilizador
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Obter o convite
  SELECT * INTO v_invite
  FROM family_invites
  WHERE id = p_invite_id AND email = v_user_email AND status = 'pending';

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado ou já não é válido';
  END IF;

  -- Verificar se o convite não expirou
  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  -- Verificar se o utilizador já não é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = v_invite.family_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Já é membro desta família';
  END IF;

  -- Inserir o utilizador como membro da família
  INSERT INTO family_members (user_id, family_id, role)
  VALUES (v_user_id, v_invite.family_id, v_invite.role);

  -- Atualizar o status do convite
  UPDATE family_invites 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invite_id;

  RETURN json_build_object('success', true, 'message', 'Convite aceite com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em accept_family_invite_by_email: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao aceitar convite';
END;
$function$
;

create or replace view "public"."account_balances" as  SELECT a.id AS account_id,
    a.user_id,
    a.family_id,
    COALESCE((a.saldo + COALESCE(sum(
        CASE
            WHEN (t.tipo = 'receita'::text) THEN t.valor
            WHEN (t.tipo = 'despesa'::text) THEN (- t.valor)
            ELSE (0)::numeric
        END), (0)::numeric)), a.saldo) AS saldo_atual
   FROM (accounts a
     LEFT JOIN transactions t ON ((t.account_id = a.id)))
  GROUP BY a.id, a.user_id, a.family_id, a.saldo;


create or replace view "public"."account_balances_v1" as  WITH account_transactions AS (
         SELECT t.account_id,
            COALESCE(sum(
                CASE
                    WHEN (t.tipo = 'receita'::text) THEN t.valor
                    WHEN (t.tipo = 'despesa'::text) THEN (- t.valor)
                    WHEN (t.tipo = 'transferencia'::text) THEN (- t.valor)
                    ELSE (0)::numeric
                END), (0)::numeric) AS saldo_atual
           FROM transactions t
          GROUP BY t.account_id
        ), account_reserved AS (
         SELECT ga.account_id,
            COALESCE(sum(ga.valor), (0)::numeric) AS reservado
           FROM (goal_allocations ga
             JOIN goals g ON ((ga.goal_id = g.id)))
          WHERE (g.ativa = true)
          GROUP BY ga.account_id
        )
 SELECT a.id AS account_id,
    a.nome,
    a.tipo,
    a.family_id,
    a.user_id,
    COALESCE(at.saldo_atual, (0)::numeric) AS saldo_atual,
    COALESCE(ar.reservado, (0)::numeric) AS reservado,
        CASE
            WHEN (a.tipo = 'cartão de crédito'::text) THEN (0)::numeric
            ELSE COALESCE(ar.reservado, (0)::numeric)
        END AS reservado_final,
        CASE
            WHEN (a.tipo = 'cartão de crédito'::text) THEN NULL::numeric
            ELSE GREATEST((COALESCE(at.saldo_atual, (0)::numeric) - COALESCE(ar.reservado, (0)::numeric)), (0)::numeric)
        END AS disponivel,
        CASE
            WHEN (a.tipo = 'cartão de crédito'::text) THEN (COALESCE(at.saldo_atual, (0)::numeric) < (0)::numeric)
            ELSE NULL::boolean
        END AS is_in_debt
   FROM ((accounts a
     LEFT JOIN account_transactions at ON ((a.id = at.account_id)))
     LEFT JOIN account_reserved ar ON ((a.id = ar.account_id)));


create or replace view "public"."account_reserved" as  SELECT a.id AS account_id,
        CASE
            WHEN (a.nome = 'Objetivos'::text) THEN COALESCE(( SELECT sum(ga_1.valor) AS sum
               FROM (goal_allocations ga_1
                 JOIN goals g ON ((ga_1.goal_id = g.id)))
              WHERE ((g.user_id = a.user_id) AND (g.id IN ( SELECT DISTINCT goal_allocations.goal_id
                       FROM goal_allocations)))), (0)::numeric)
            ELSE COALESCE(sum(ga.valor), (0)::numeric)
        END AS total_reservado
   FROM (accounts a
     LEFT JOIN goal_allocations ga ON ((ga.account_id = a.id)))
  GROUP BY a.id, a.nome, a.user_id;


CREATE OR REPLACE FUNCTION public.allocate_to_goal_with_transaction(goal_id_param uuid, account_id_param uuid, amount_param numeric, user_id_param uuid, description_param text DEFAULT 'Alocação para objetivo'::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  categoria_id uuid;
  objetivos_account_id uuid;
  allocation_record record;
  transaction_record record;
BEGIN
  -- Iniciar transação
  BEGIN
    -- 1. Buscar ou criar a categoria "Objetivos"
    SELECT id INTO categoria_id
    FROM categories
    WHERE user_id = user_id_param AND nome = 'Objetivos';
    
    IF categoria_id IS NULL THEN
      INSERT INTO categories (nome, user_id, cor)
      VALUES ('Objetivos', user_id_param, '#3B82F6')
      RETURNING id INTO categoria_id;
    END IF;
    
    -- 2. Buscar a conta "Objetivos"
    SELECT id INTO objetivos_account_id
    FROM accounts
    WHERE user_id = user_id_param AND nome = 'Objetivos';
    
    IF objetivos_account_id IS NULL THEN
      RAISE EXCEPTION 'Conta "Objetivos" não encontrada';
    END IF;
    
    -- 3. Criar a alocação apenas na conta origem
    INSERT INTO goal_allocations (
      goal_id,
      account_id,
      valor,
      descricao,
      user_id,
      data_alocacao
    )
    VALUES (
      goal_id_param,
      account_id_param,
      amount_param,
      description_param,
      user_id_param,
      NOW()
    )
    RETURNING * INTO allocation_record;
    
    -- 4. Criar a transação como transferência (não afeta o saldo total)
    INSERT INTO transactions (
      account_id,
      categoria_id,
      valor,
      tipo,
      data,
      descricao,
      goal_id,
      user_id
    )
    VALUES (
      account_id_param,
      categoria_id,
      amount_param,
      'transferencia',
      NOW()::date,
      description_param,
      goal_id_param,
      user_id_param
    )
    RETURNING * INTO transaction_record;
    
    -- 5. Adicionar valor ao saldo total da conta "Objetivos"
    UPDATE accounts 
    SET saldo = saldo + amount_param
    WHERE id = objetivos_account_id;
    
    -- Retornar resultado
    RETURN json_build_object(
      'allocation', row_to_json(allocation_record),
      'transaction', row_to_json(transaction_record),
      'success', true
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RAISE EXCEPTION 'Erro na alocação: %', SQLERRM;
  END;
END;
$function$
;

create or replace view "public"."budget_progress" as  SELECT b.id AS budget_id,
    b.user_id,
    b.categoria_id,
    c.nome AS categoria_nome,
    c.cor AS categoria_cor,
    b.valor AS valor_orcamento,
    b.mes,
    COALESCE(sum(
        CASE
            WHEN (t.tipo = 'despesa'::text) THEN t.valor
            ELSE (0)::numeric
        END), (0)::numeric) AS valor_gasto,
    (b.valor - COALESCE(sum(
        CASE
            WHEN (t.tipo = 'despesa'::text) THEN t.valor
            ELSE (0)::numeric
        END), (0)::numeric)) AS valor_restante,
        CASE
            WHEN (b.valor > (0)::numeric) THEN round(((COALESCE(sum(
            CASE
                WHEN (t.tipo = 'despesa'::text) THEN t.valor
                ELSE (0)::numeric
            END), (0)::numeric) / b.valor) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS progresso_percentual
   FROM ((budgets b
     LEFT JOIN categories c ON ((c.id = b.categoria_id)))
     LEFT JOIN transactions t ON (((t.categoria_id = b.categoria_id) AND (t.user_id = b.user_id) AND (date_trunc('month'::text, (t.data)::timestamp with time zone) = date_trunc('month'::text, (to_date((b.mes)::text, 'YYYY-MM'::text))::timestamp with time zone)))))
  GROUP BY b.id, b.user_id, b.categoria_id, c.nome, c.cor, b.valor, b.mes;


CREATE OR REPLACE FUNCTION public.cancel_family_invite(p_invite_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT fm.role INTO v_user_role
  FROM family_members fm
  JOIN family_invites fi ON fm.family_id = fi.family_id
  WHERE fi.id = p_invite_id AND fm.user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não tem permissão para cancelar este convite';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cancelar convites';
  END IF;

  -- Cancelar o convite
  UPDATE family_invites 
  SET status = 'cancelled'
  WHERE id = p_invite_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou já não está pendente';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Convite cancelado com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em cancel_family_invite: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao cancelar convite';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_credit_card_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_account RECORD;
  v_total_expenses NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_category_id UUID;
BEGIN
  -- Verificar se é uma transação de cartão de crédito
  SELECT * INTO v_account
  FROM accounts 
  WHERE id = NEW.account_id;
  
  IF v_account.tipo = 'cartão de crédito' THEN
    -- Calcular totais atuais (excluindo ajustes de saldo)
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND descricao NOT LIKE 'Ajuste de saldo%' THEN valor ELSE 0 END), 0)
    INTO v_total_expenses, v_total_payments
    FROM transactions 
    WHERE account_id = NEW.account_id;
    
    -- Calcular saldo
    v_balance := v_total_payments - v_total_expenses;
    
    -- Se o saldo é 0 (em dia), zerar totais e saldo
    IF v_balance = 0 AND (v_total_expenses > 0 OR v_total_payments > 0) THEN
      -- Buscar categoria "Ajuste"
      SELECT id INTO v_category_id FROM categories 
      WHERE nome = 'Ajuste' AND user_id = NEW.user_id 
      LIMIT 1;
      
      IF NOT FOUND THEN
        INSERT INTO categories (nome, user_id, cor)
        VALUES ('Ajuste', NEW.user_id, '#6B7280')
        RETURNING id INTO v_category_id;
      END IF;
      
      -- Criar transação de ajuste para zerar gastos
      IF v_total_expenses > 0 THEN
        INSERT INTO transactions (
          user_id,
          account_id,
          categoria_id,
          valor,
          tipo,
          data,
          descricao
        ) VALUES (
          NEW.user_id,
          NEW.account_id,
          v_category_id,
          v_total_expenses,
          'receita', -- Receita para compensar gastos
          CURRENT_DATE,
          'Ajuste de saldo: Zerar gastos (cartão em dia)'
        );
      END IF;
      
      -- Criar transação de ajuste para zerar pagamentos
      IF v_total_payments > 0 THEN
        INSERT INTO transactions (
          user_id,
          account_id,
          categoria_id,
          valor,
          tipo,
          data,
          descricao
        ) VALUES (
          NEW.user_id,
          NEW.account_id,
          v_category_id,
          v_total_payments,
          'despesa', -- Despesa para compensar pagamentos
          CURRENT_DATE,
          'Ajuste de saldo: Zerar pagamentos (cartão em dia)'
        );
      END IF;
      
      -- Atualizar saldo da conta para 0
      UPDATE accounts 
      SET saldo = 0 
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_all_old_transfer_transactions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_transfer RECORD;
BEGIN
  -- Eliminar todas as transações antigas de transferência (despesa e receita)
  DELETE FROM transactions 
  WHERE descricao LIKE '%Transferência%' 
  AND tipo IN ('despesa', 'receita');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  v_result := jsonb_build_object(
    'success', true,
    'transactions_deleted', v_deleted_count,
    'message', 'Todas as transações antigas de transferência foram eliminadas'
  );
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_backups()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Eliminar backups expirados
  DELETE FROM family_backups 
  WHERE expires_at < now() 
    AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_transfer_transactions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_pairs_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_pair RECORD;
BEGIN
  -- Encontrar pares de transações de transferência (despesa + receita com mesma descrição e valor)
  FOR v_pair IN 
    SELECT 
      t1.id as expense_id,
      t2.id as income_id,
      t1.user_id,
      t1.valor,
      t1.data,
      t1.categoria_id,
      t1.descricao,
      t1.account_id as from_account_id,
      t2.account_id as to_account_id,
      t1.created_at
    FROM transactions t1
    INNER JOIN transactions t2 ON 
      t1.user_id = t2.user_id 
      AND t1.valor = t2.valor 
      AND t1.data = t2.data
      AND t1.descricao = t2.descricao
      AND t1.descricao LIKE '%Transferência%'
      AND t1.tipo = 'despesa'
      AND t2.tipo = 'receita'
      AND t1.id < t2.id -- Evitar duplicatas
  LOOP
    v_pairs_count := v_pairs_count + 1;
    
    -- Criar uma nova transação de transferência
    INSERT INTO transactions (
      user_id,
      valor,
      data,
      categoria_id,
      tipo,
      descricao,
      account_id
    ) VALUES (
      v_pair.user_id,
      v_pair.valor,
      v_pair.data,
      v_pair.categoria_id,
      'transferencia',
      v_pair.descricao,
      v_pair.from_account_id
    );
    
    v_created_count := v_created_count + 1;
    
    -- Eliminar as transações antigas (despesa e receita)
    DELETE FROM transactions WHERE id = v_pair.expense_id;
    DELETE FROM transactions WHERE id = v_pair.income_id;
    
    v_deleted_count := v_deleted_count + 2;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'pairs_found', v_pairs_count,
    'transactions_created', v_created_count,
    'transactions_deleted', v_deleted_count,
    'message', 'Limpeza de transações duplas concluída'
  );
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_unused_indexes()
 RETURNS TABLE(index_name text, table_name text, index_size text, last_scan_days integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname::text,
        t.relname::text,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::text,
        EXTRACT(DAYS FROM NOW() - s.last_idx_scan)::integer
    FROM pg_indexes i
    JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
    JOIN pg_stat_user_tables t ON s.relname = t.relname
    WHERE i.schemaname = 'public'
      AND s.idx_scan = 0
      AND s.last_idx_scan < NOW() - INTERVAL '30 days'
    ORDER BY pg_relation_size(i.indexname::regclass) DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_backup(p_family_id uuid, p_backup_type text DEFAULT 'full'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_family_record RECORD;
  v_backup_id UUID;
  v_backup_data JSONB;
  v_file_path TEXT;
  v_file_size BIGINT;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se a família existe e se o utilizador tem permissão
  SELECT f.* INTO v_family_record
  FROM families f
  JOIN family_members fm ON fm.family_id = f.id
  WHERE f.id = p_family_id 
    AND fm.user_id = v_user_id
    AND fm.role IN ('owner', 'admin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Família não encontrada ou não tem permissão para criar backup';
  END IF;

  -- Criar registo de backup
  INSERT INTO family_backups (
    family_id,
    created_by,
    backup_type,
    status,
    metadata
  ) VALUES (
    p_family_id,
    v_user_id,
    p_backup_type,
    'processing',
    p_metadata
  ) RETURNING id INTO v_backup_id;

  -- Coletar dados da família
  SELECT jsonb_build_object(
    'family', f,
    'members', COALESCE(members_data.data, '[]'::jsonb),
    'accounts', COALESCE(accounts_data.data, '[]'::jsonb),
    'goals', COALESCE(goals_data.data, '[]'::jsonb),
    'budgets', COALESCE(budgets_data.data, '[]'::jsonb),
    'transactions', COALESCE(transactions_data.data, '[]'::jsonb),
    'categories', COALESCE(categories_data.data, '[]'::jsonb),
    'invites', COALESCE(invites_data.data, '[]'::jsonb),
    'backup_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'backup_type', p_backup_type,
      'family_name', f.nome
    )
  ) INTO v_backup_data
  FROM families f
  LEFT JOIN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'member', fm,
        'profile', p
      )
    ) as data
    FROM family_members fm
    LEFT JOIN profiles p ON p.user_id = fm.user_id
    WHERE fm.family_id = p_family_id
  ) members_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(a.*) as data
    FROM accounts a
    WHERE a.family_id = p_family_id
  ) accounts_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(g.*) as data
    FROM goals g
    WHERE g.family_id = p_family_id
  ) goals_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(b.*) as data
    FROM budgets b
    JOIN family_members fm ON fm.user_id = b.user_id
    WHERE fm.family_id = p_family_id
  ) budgets_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(t.*) as data
    FROM transactions t
    WHERE t.family_id = p_family_id
  ) transactions_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(c.*) as data
    FROM categories c
    WHERE c.family_id = p_family_id
  ) categories_data ON true
  LEFT JOIN (
    SELECT jsonb_agg(fi.*) as data
    FROM family_invites fi
    WHERE fi.family_id = p_family_id
  ) invites_data ON true
  WHERE f.id = p_family_id;

  -- Gerar nome do ficheiro
  v_file_path := 'family-backups/' || p_family_id || '/' || v_backup_id || '_' || 
                 to_char(now(), 'YYYYMMDD_HH24MISS') || '.json';

  -- Guardar backup no storage (simulado - em produção seria guardado no Supabase Storage)
  -- Por agora, vamos apenas atualizar o registo com o caminho
  UPDATE family_backups 
  SET 
    file_path = v_file_path,
    file_size = jsonb_array_length(v_backup_data),
    status = 'completed',
    completed_at = now()
  WHERE id = v_backup_id;

  -- Criar notificação de backup concluído
  PERFORM create_family_notification(
    p_family_id,
    v_user_id,
    'Backup Concluído',
    'O backup da família foi criado com sucesso',
    'success',
    'backup',
    jsonb_build_object(
      'backup_id', v_backup_id,
      'file_path', v_file_path,
      'file_size', jsonb_array_length(v_backup_data)
    )
  );

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'file_path', v_file_path,
    'file_size', jsonb_array_length(v_backup_data),
    'message', 'Backup criado com sucesso'
  ) INTO v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Marcar backup como falhado
    UPDATE family_backups 
    SET 
      status = 'failed',
      error_message = SQLERRM,
      completed_at = now()
    WHERE id = v_backup_id;

    -- Criar notificação de erro
    PERFORM create_family_notification(
      p_family_id,
      v_user_id,
      'Erro no Backup',
      'Ocorreu um erro ao criar o backup da família',
      'error',
      'backup',
      jsonb_build_object(
        'backup_id', v_backup_id,
        'error', SQLERRM
      )
    );

    RAISE EXCEPTION 'Erro ao criar backup: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_direct(p_family_name text, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_family_id UUID;
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO families (nome, created_by, settings)
  VALUES (
    p_family_name,
    p_user_id,
    '{"allow_view_all": true, "allow_add_transactions": true, "require_approval": false}'::json
  )
  RETURNING id INTO v_family_id;
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);
  RETURN v_family_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_notification(p_family_id uuid, p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_category text DEFAULT 'system'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  
  -- Criar notificação para todos os membros da família
  INSERT INTO notifications (
    user_id,
    family_id,
    title,
    message,
    type,
    category,
    metadata,
    read,
    created_at
  )
  SELECT 
    fm.user_id,
    p_family_id,
    p_title,
    p_message,
    p_type,
    p_category,
    p_metadata,
    false,
    now()
  FROM family_members fm
  WHERE fm.family_id = p_family_id
    AND fm.user_id != p_user_id; -- Não notificar o próprio utilizador que causou o evento
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Inserir família
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    v_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;

  -- Adicionar utilizador como owner
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (v_user_id, v_family_id, 'owner', ARRAY['all']);

  -- Retornar resultado
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_description text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_family_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    p_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_family_with_member(p_family_name text, p_user_id uuid, p_description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_id UUID;
  v_result JSON;
BEGIN
  -- Inserir família
  INSERT INTO families (nome, description, created_by, settings)
  VALUES (
    p_family_name,
    p_description,
    p_user_id,
    json_build_object(
      'allow_view_all', true,
      'allow_add_transactions', true,
      'require_approval', false
    )
  )
  RETURNING id INTO v_family_id;

  -- Adicionar utilizador como owner
  INSERT INTO family_members (user_id, family_id, role, permissions)
  VALUES (p_user_id, v_family_id, 'owner', ARRAY['all']);

  -- Retornar resultado
  SELECT json_build_object(
    'id', f.id,
    'nome', f.nome,
    'description', f.description,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'settings', f.settings
  ) INTO v_result
  FROM families f
  WHERE f.id = v_family_id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_transfer_transaction(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_user_id uuid, p_categoria_id uuid, p_description text DEFAULT NULL::text, p_data date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transfer_id UUID;
  v_result JSONB;
  v_from_account_saldo NUMERIC;
  v_to_account_saldo NUMERIC;
BEGIN
  -- Verificar se as contas existem e pertencem ao utilizador
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('error', 'Conta de origem não encontrada ou não pertence ao utilizador');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('error', 'Conta de destino não encontrada ou não pertence ao utilizador');
  END IF;
  
  -- Verificar se as contas são diferentes
  IF p_from_account_id = p_to_account_id THEN
    RETURN jsonb_build_object('error', 'As contas de origem e destino devem ser diferentes');
  END IF;
  
  -- Verificar se o valor é positivo
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'O valor da transferência deve ser positivo');
  END IF;
  
  -- Obter saldos atuais das contas
  SELECT saldo INTO v_from_account_saldo FROM accounts WHERE id = p_from_account_id;
  SELECT saldo INTO v_to_account_saldo FROM accounts WHERE id = p_to_account_id;
  
  -- Verificar se há saldo suficiente na conta de origem
  IF v_from_account_saldo < p_amount THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente na conta de origem');
  END IF;
  
  -- Verificar se a categoria existe
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_categoria_id) THEN
    RETURN jsonb_build_object('error', 'Categoria não encontrada');
  END IF;
  
  -- Iniciar transação
  BEGIN
    -- Criar APENAS UMA transação de transferência
    INSERT INTO transactions (
      user_id,
      valor,
      data,
      categoria_id,
      tipo,
      descricao,
      account_id
    ) VALUES (
      p_user_id,
      p_amount,
      p_data,
      p_categoria_id,
      'transferencia', -- Tipo especial para transferências
      COALESCE(p_description, 'Transferência entre contas'),
      p_from_account_id -- Conta de origem
    ) RETURNING id INTO v_transfer_id;
    
    -- Atualizar saldo da conta de origem (diminuir)
    UPDATE accounts 
    SET saldo = saldo - p_amount 
    WHERE id = p_from_account_id;
    
    -- Atualizar saldo da conta de destino (aumentar)
    UPDATE accounts 
    SET saldo = saldo + p_amount 
    WHERE id = p_to_account_id;
    
    -- Retornar sucesso
    v_result := jsonb_build_object(
      'success', true,
      'transfer_id', v_transfer_id,
      'amount', p_amount,
      'message', 'Transferência realizada com sucesso'
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Em caso de erro, fazer rollback automático
      RETURN jsonb_build_object('error', 'Erro ao realizar transferência: ' || SQLERRM);
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_account_with_related_data(p_account_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account_name TEXT;
  v_result JSONB;
  v_transaction_count INTEGER;
  v_goal_allocations_count INTEGER;
BEGIN
  -- Verificar se a conta existe e pertence ao utilizador
  SELECT nome INTO v_account_name
  FROM accounts 
  WHERE id = p_account_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;
  
  -- Contar dados relacionados para informação
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions 
  WHERE account_id = p_account_id;
  
  SELECT COUNT(*) INTO v_goal_allocations_count
  FROM goal_allocations 
  WHERE account_id = p_account_id;
  
  -- Iniciar transação para garantir consistência
  BEGIN
    -- Eliminar alocações de objetivos associadas à conta
    DELETE FROM goal_allocations WHERE account_id = p_account_id;
    
    -- Eliminar transações associadas à conta
    DELETE FROM transactions WHERE account_id = p_account_id;
    
    -- Atualizar objetivos que usam esta conta (definir account_id como NULL)
    UPDATE goals SET account_id = NULL WHERE account_id = p_account_id;
    
    -- Finalmente, eliminar a conta
    DELETE FROM accounts WHERE id = p_account_id AND user_id = p_user_id;
    
    -- Retornar sucesso
    v_result := jsonb_build_object(
      'success', true,
      'account_name', v_account_name,
      'transactions_deleted', v_transaction_count,
      'goal_allocations_deleted', v_goal_allocations_count,
      'message', 'Conta eliminada com sucesso'
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Em caso de erro, fazer rollback automático
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro ao eliminar conta: ' || SQLERRM
      );
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_family_with_cascade(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_family_record RECORD;
  v_result JSON;
  v_deleted_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se a família existe e se o utilizador é o owner
  SELECT * INTO v_family_record
  FROM families
  WHERE id = p_family_id AND created_by = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Família não encontrada ou não tem permissão para eliminá-la';
  END IF;

  -- Iniciar transação para garantir consistência
  BEGIN
    -- 1. Eliminar goal_allocations relacionados a objetivos da família
    DELETE FROM goal_allocations 
    WHERE goal_id IN (
      SELECT id FROM goals WHERE family_id = p_family_id
    );
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 2. Eliminar transações da família
    DELETE FROM transactions WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 3. Eliminar orçamentos da família
    DELETE FROM budgets 
    WHERE user_id IN (
      SELECT user_id FROM family_members WHERE family_id = p_family_id
    );
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 4. Eliminar objetivos da família
    DELETE FROM goals WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 5. Eliminar contas da família
    DELETE FROM accounts WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 6. Eliminar categorias da família
    DELETE FROM categories WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 7. Eliminar convites da família
    DELETE FROM family_invites WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 8. Eliminar membros da família
    DELETE FROM family_members WHERE family_id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- 9. Finalmente, eliminar a família
    DELETE FROM families WHERE id = p_family_id;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- Retornar resultado
    SELECT json_build_object(
      'success', true,
      'family_id', p_family_id,
      'family_name', v_family_record.nome,
      'deleted_records', v_deleted_count,
      'message', 'Família eliminada com sucesso e todos os dados relacionados foram removidos'
    ) INTO v_result;
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RAISE EXCEPTION 'Erro ao eliminar família: %', SQLERRM;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_goal_with_restoration(goal_id_param uuid, user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  goal_record record;
  allocation_record record;
  total_allocated numeric := 0;
  goal_progress numeric := 0;
  account_id uuid;
  objetivos_account_id uuid;
  result json;
BEGIN
  -- 1. Buscar informações do objetivo
  SELECT * INTO goal_record 
  FROM goals 
  WHERE id = goal_id_param AND user_id = user_id_param;
  
  IF goal_record IS NULL THEN
    RAISE EXCEPTION 'Objetivo não encontrado';
  END IF;
  
  -- 2. Calcular progresso do objetivo
  SELECT COALESCE(SUM(valor), 0) INTO total_allocated
  FROM goal_allocations 
  WHERE goal_id = goal_id_param;
  
  IF goal_record.valor_objetivo > 0 THEN
    goal_progress := (total_allocated / goal_record.valor_objetivo) * 100;
  END IF;
  
  -- 3. Buscar a conta associada ao objetivo (primeira alocação)
  SELECT ga.account_id INTO account_id
  FROM goal_allocations ga
  WHERE ga.goal_id = goal_id_param 
  LIMIT 1;
  
  -- 4. Buscar a conta "Objetivos"
  SELECT id INTO objetivos_account_id
  FROM accounts 
  WHERE user_id = user_id_param AND nome = 'Objetivos'
  LIMIT 1;
  
  -- 5. Ajustar saldos baseado no progresso
  IF goal_progress < 100 AND account_id IS NOT NULL THEN
    -- Objetivo < 100%: NÃO fazer nada na conta origem
    -- Apenas remover as alocações - o valor voltará automaticamente para disponível
    
    -- Deduzir da conta objetivos (tanto saldo total como reservado)
    IF objetivos_account_id IS NOT NULL THEN
      UPDATE accounts 
      SET saldo = saldo - total_allocated
      WHERE id = objetivos_account_id;
    END IF;
    
  ELSIF goal_progress >= 100 AND account_id IS NOT NULL THEN
    -- Objetivo >= 100%: Deduzir da conta origem (reservado e total)
    UPDATE accounts 
    SET saldo = saldo - total_allocated
    WHERE id = account_id;
    
    -- NÃO deduzir da conta objetivos - manter saldo total, apenas reservado diminui
  END IF;
  
  -- 6. Eliminar todas as alocações do objetivo
  DELETE FROM goal_allocations WHERE goal_id = goal_id_param;
  
  -- 7. Eliminar o objetivo
  DELETE FROM goals WHERE id = goal_id_param AND user_id = user_id_param;
  
  -- 8. Retornar resultado
  result := json_build_object(
    'success', true,
    'goal_name', goal_record.nome,
    'total_allocated', total_allocated,
    'goal_progress', goal_progress,
    'restored_to_account', goal_progress < 100,
    'account_id', account_id,
    'objetivos_account_id', objetivos_account_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN 
    RAISE EXCEPTION 'Erro ao eliminar objetivo: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_transaction_family_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Se family_id não foi definido, buscar da conta associada
  IF NEW.family_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT a.family_id INTO NEW.family_id
    FROM accounts a
    WHERE a.id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

create or replace view "public"."family_members_with_profile" as  SELECT fm.id,
    fm.user_id,
    fm.family_id,
    fm.role,
    fm.permissions,
    fm.joined_at,
    p.nome AS profile_nome
   FROM (family_members fm
     LEFT JOIN profiles p ON (((fm.user_id)::text = (p.user_id)::text)));


CREATE OR REPLACE FUNCTION public.get_accounts_with_balances(p_scope text DEFAULT 'personal'::text, p_family_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_id uuid, nome text, tipo text, family_id uuid, user_id uuid, saldo_atual numeric, reservado numeric, disponivel numeric, is_in_debt boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Log para debug
  RAISE LOG 'get_accounts_with_balances: user_id=%', v_user_id;
  
  -- Verificar se o utilizador está autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Validar parâmetros
  IF p_scope NOT IN ('personal', 'family') THEN
    RAISE EXCEPTION 'Escopo inválido. Deve ser "personal" ou "family"';
  END IF;

  IF p_scope = 'family' AND p_family_id IS NULL THEN
    RAISE EXCEPTION 'family_id é obrigatório quando scope = "family"';
  END IF;

  -- Verificar permissões para família
  IF p_scope = 'family' THEN
    IF NOT EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = p_family_id 
      AND fm.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Sem permissão para aceder a esta família';
    END IF;
  END IF;

  -- Retornar dados baseados no escopo
  RETURN QUERY
  SELECT 
    ab.account_id,
    ab.nome,
    ab.tipo,
    ab.family_id,
    ab.user_id,
    ab.saldo_atual,
    ab.reservado_final as reservado,
    ab.disponivel,
    ab.is_in_debt
  FROM account_balances_v1 ab
  WHERE 
    CASE 
      WHEN p_scope = 'personal' THEN
        -- Contas pessoais: sem family_id e pertencentes ao utilizador
        ab.family_id IS NULL AND ab.user_id = v_user_id
      WHEN p_scope = 'family' THEN
        -- Contas familiares: com family_id específico
        ab.family_id = p_family_id
      ELSE
        FALSE
    END
  ORDER BY ab.nome;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_credit_card_summary(p_user_id uuid, p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_total_expenses NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_current_balance NUMERIC := 0;
  v_available_credit NUMERIC := 0;
  v_credit_limit NUMERIC := 0;
BEGIN
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;

  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;

  -- Calculate totals from ALL transactions (including adjustments)
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
  INTO v_total_expenses, v_total_payments
  FROM transactions
  WHERE account_id = p_account_id;

  -- The current balance should reflect the actual account saldo
  v_current_balance := v_account.saldo;

  v_available_credit := GREATEST(0, v_credit_limit + v_current_balance);

  v_result := jsonb_build_object(
    'success', true,
    'account_name', v_account.nome,
    'current_balance', v_current_balance,
    'total_expenses', v_total_expenses,
    'total_payments', v_total_payments,
    'available_credit', v_available_credit,
    'credit_limit', v_credit_limit,
    'is_in_debt', v_current_balance < 0,
    'debt_amount', CASE WHEN v_current_balance < 0 THEN ABS(v_current_balance) ELSE 0 END,
    'summary', CASE
      WHEN v_current_balance < 0 THEN
        'Dívida de ' || ABS(v_current_balance) || '€'
      WHEN v_current_balance = 0 THEN
        'Saldo zerado'
      ELSE
        'Crédito disponível de ' || v_current_balance || '€'
    END
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_accounts_with_balances(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, family_id uuid, nome text, tipo text, saldo numeric, saldo_atual numeric, total_reservado numeric, saldo_disponivel numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    abwr.account_id as id,
    abwr.account_user_id as user_id,
    abwr.account_family_id as family_id,
    abwr.account_nome as nome,
    abwr.account_tipo as tipo,
    abwr.saldo_total::DECIMAL(10,2) as saldo,
    abwr.saldo_atual::DECIMAL(10,2),
    abwr.total_reservado::DECIMAL(10,2),
    abwr.saldo_disponivel::DECIMAL(10,2),
    abwr.account_created_at as created_at
  FROM account_balances_with_reserved abwr
  WHERE abwr.account_family_id IN (
    SELECT fm.family_id 
    FROM family_members fm 
    WHERE fm.user_id = COALESCE(p_user_id, auth.uid())
  )
  ORDER BY abwr.account_created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_backup_stats(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.family_id = p_family_id 
      AND fm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Não tem permissão para aceder a esta família';
  END IF;

  -- Obter estatísticas
  SELECT jsonb_build_object(
    'total_backups', COUNT(*),
    'completed_backups', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending_backups', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_size', COALESCE(SUM(file_size), 0),
    'latest_backup', MAX(created_at) FILTER (WHERE status = 'completed'),
    'oldest_backup', MIN(created_at) FILTER (WHERE status = 'completed')
  ) INTO v_result
  FROM family_backups
  WHERE family_id = p_family_id;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_budgets(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, categoria_id uuid, valor numeric, mes text, user_id uuid, family_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get family budgets (family_id IS NOT NULL)
    RETURN QUERY
    SELECT 
      b.id,
      b.categoria_id,
      b.valor,
      b.mes,
      b.user_id,
      b.family_id,
      b.created_at,
      b.updated_at
    FROM budgets b
    WHERE b.user_id = v_user_id
      AND b.family_id IS NOT NULL
    ORDER BY b.created_at DESC;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_data_by_id(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE user_id = auth.uid() AND family_id = p_family_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Acesso negado');
  END IF;
  
  BEGIN
    SELECT json_build_object(
      'success', true,
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      )
    ) INTO v_result
    FROM families f
    WHERE f.id = p_family_id;
    
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    ELSE
      RETURN json_build_object('success', false, 'message', 'Família não encontrada');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_family_data_by_id: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Erro interno do servidor');
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_goals(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, valor_objetivo numeric, valor_atual numeric, prazo date, ativa boolean, user_id uuid, family_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get family goals (family_id IS NOT NULL)
    RETURN QUERY
    SELECT 
      g.id,
      g.nome,
      g.valor_objetivo,
      g.valor_atual,
      g.prazo,
      g.ativa,
      g.user_id,
      g.family_id,
      g.created_at,
      g.updated_at
    FROM goals g
    WHERE g.user_id = v_user_id
      AND g.family_id IS NOT NULL
    ORDER BY g.created_at DESC;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_kpis()
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric, total_members integer, pending_invites integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
  v_user_id UUID;
  v_family_id UUID;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  total_bal DECIMAL(10,2) := 0;
  cc_debt DECIMAL(10,2) := 0;
  monthly_sav DECIMAL(10,2) := 0;
  total_members_count INTEGER := 0;
  pending_invites_count INTEGER := 0;
  budget_spent DECIMAL(10,2) := 0;
  budget_amount DECIMAL(10,2) := 0;
  budget_percentage DECIMAL(5,2) := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Get user's family ID
  SELECT fm.family_id INTO v_family_id
  FROM family_members fm
  WHERE fm.user_id = v_user_id
  LIMIT 1;
  
  -- If user has no family, return zeros
  IF v_family_id IS NULL THEN
    RETURN QUERY
    SELECT 
      0::DECIMAL(10,2) as total_balance,
      0::DECIMAL(10,2) as credit_card_debt,
      0::DECIMAL(5,2) as top_goal_progress,
      0::DECIMAL(10,2) as monthly_savings,
      0::DECIMAL(10,2) as goals_account_balance,
      0::DECIMAL(10,2) as total_goals_value,
      0::DECIMAL(5,2) as goals_progress_percentage,
      0::DECIMAL(10,2) as total_budget_spent,
      0::DECIMAL(10,2) as total_budget_amount,
      0::DECIMAL(5,2) as budget_spent_percentage,
      0::INTEGER as total_members,
      0::INTEGER as pending_invites;
    RETURN;
  END IF;
  
  -- Calculate total balance (regular accounts only)
  SELECT COALESCE(SUM(CASE WHEN a.tipo != 'cartão de crédito' THEN a.saldo ELSE 0 END), 0) 
  INTO total_bal
  FROM accounts a
  WHERE a.family_id = v_family_id;
  
  -- Calculate credit card debt
  SELECT COALESCE(SUM(CASE WHEN a.tipo = 'cartão de crédito' AND a.saldo < 0 THEN ABS(a.saldo) ELSE 0 END), 0) 
  INTO cc_debt
  FROM accounts a
  WHERE a.family_id = v_family_id;
  
  -- Calculate goals account balance
  SELECT COALESCE(a.saldo, 0) INTO goals_account_bal
  FROM accounts a
  WHERE a.family_id = v_family_id
    AND (LOWER(a.nome) LIKE '%objetivo%' OR LOWER(a.tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE family_id = v_family_id;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE family_id = v_family_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings
  SELECT 
    COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0)
  INTO monthly_sav
  FROM transactions t
  WHERE t.family_id = v_family_id
    AND t.data::text LIKE current_month || '%';
  
  -- Calculate total family members
  SELECT COUNT(*) INTO total_members_count
  FROM family_members fm
  WHERE fm.family_id = v_family_id;
  
  -- Calculate pending invites
  SELECT COUNT(*) INTO pending_invites_count
  FROM family_invites fi
  WHERE fi.family_id = v_family_id
    AND fi.status = 'pending';
  
  -- Return results
  RETURN QUERY
  SELECT 
    total_bal as total_balance,
    cc_debt as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_sav as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    budget_spent as total_budget_spent,
    budget_amount as total_budget_amount,
    budget_percentage as budget_spent_percentage,
    total_members_count as total_members,
    pending_invites_count as pending_invites;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_kpis_with_user(p_user_id uuid)
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric, total_members integer, pending_invites integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
  total_members_val INTEGER := 0;
  pending_invites_val INTEGER := 0;
  current_family_id UUID;
BEGIN
  -- If no user is provided, return zeros
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage,
      0 as total_members,
      0 as pending_invites;
    RETURN;
  END IF;
  
  -- Get current family ID for the user
  SELECT family_id INTO current_family_id
  FROM family_members 
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If no family found, return zeros
  IF current_family_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage,
      0 as total_members,
      0 as pending_invites;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt for family
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM public.accounts 
  WHERE family_id = current_family_id;
  
  -- Calculate goals account balance for family (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM public.accounts 
  WHERE family_id = current_family_id
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value for family
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM public.goals 
  WHERE family_id = current_family_id;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress for family
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM public.goals 
  WHERE family_id = current_family_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings for family
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM public.transactions 
  WHERE family_id = current_family_id
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values for family (using budgets table)
  SELECT 
    COALESCE(SUM(valor), 0)
  INTO total_budget_amount_val
  FROM public.budgets 
  WHERE family_id = current_family_id;
  
  -- For family budgets, we'll set spent to 0 for now (can be calculated from transactions later)
  total_budget_spent_val := 0;
  
  -- Calculate total members
  SELECT COUNT(*) INTO total_members_val
  FROM family_members 
  WHERE family_id = current_family_id;
  
  -- Calculate pending invites
  SELECT COUNT(*) INTO pending_invites_val
  FROM family_invites 
  WHERE family_id = current_family_id AND status = 'pending';
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage,
    total_members_val as total_members,
    pending_invites_val as pending_invites;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_members_simple(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter membros da família com perfis (sem verificação de autenticação)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM family_members fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  WHERE fm.family_id = p_family_id
  ORDER BY fm.joined_at ASC;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_simple: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_members_test(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter membros da família com perfis e emails (corrigido)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, 'Email não disponível'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM (
    SELECT 
      fm.id,
      fm.user_id,
      fm.family_id,
      fm.role,
      fm.joined_at
    FROM family_members fm
    WHERE fm.family_id = p_family_id
    ORDER BY fm.joined_at ASC
  ) fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_members_test: Retornando % membros para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_test: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_members_with_profiles(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Verificar se há utilizador autenticado
  IF v_user_id IS NULL THEN
    RAISE LOG 'get_family_members_with_profiles: Utilizador não autenticado';
    RETURN '[]'::json;
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE LOG 'get_family_members_with_profiles: Utilizador % não é membro da família %', v_user_id, p_family_id;
    RETURN '[]'::json;
  END IF;

  -- Obter membros da família com perfis e emails (corrigido)
  SELECT json_agg(
    json_build_object(
      'id', fm.id,
      'user_id', fm.user_id,
      'family_id', fm.family_id,
      'role', fm.role,
      'joined_at', fm.joined_at,
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, 'Email não disponível'),
        'foto_url', p.foto_url
      )
    )
  ) INTO v_result
  FROM (
    SELECT 
      fm.id,
      fm.user_id,
      fm.family_id,
      fm.role,
      fm.joined_at
    FROM family_members fm
    WHERE fm.family_id = p_family_id
    ORDER BY fm.joined_at ASC
  ) fm
  LEFT JOIN profiles p ON fm.user_id = p.user_id
  LEFT JOIN auth.users au ON fm.user_id = au.id;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_members_with_profiles: Retornando % membros para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  -- Retornar resultado ou array vazio
  RETURN COALESCE(v_result, '[]'::json);
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debugging
  RAISE LOG 'Erro em get_family_members_with_profiles: %', SQLERRM;
  -- Retornar array vazio em caso de erro
  RETURN '[]'::json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_pending_invites(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  
  -- Verificar se há utilizador autenticado
  IF v_user_id IS NULL THEN
    RAISE LOG 'get_family_pending_invites: Utilizador não autenticado';
    RETURN '[]'::json;
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE LOG 'get_family_pending_invites: Utilizador % não é membro da família %', v_user_id, p_family_id;
    RETURN '[]'::json;
  END IF;

  -- Obter convites pendentes
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'invited_by', fi.invited_by,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at
    )
  ) INTO v_result
  FROM family_invites fi
  WHERE fi.family_id = p_family_id AND fi.status = 'pending'
  ORDER BY fi.created_at DESC;

  -- Log do resultado para debugging
  RAISE LOG 'get_family_pending_invites: Retornando % convites para família %', 
    CASE WHEN v_result IS NULL THEN 0 ELSE json_array_length(v_result) END, 
    p_family_id;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_family_pending_invites: %', SQLERRM;
  RETURN '[]'::json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_statistics(p_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é membro da família
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;

  -- Calcular estatísticas
  SELECT json_build_object(
    'total_members', (
      SELECT COUNT(*) FROM family_members WHERE family_id = p_family_id
    ),
    'pending_invites', (
      SELECT COUNT(*) FROM family_invites WHERE family_id = p_family_id AND status = 'pending'
    ),
    'shared_goals', (
      SELECT COUNT(*) FROM goals WHERE family_id = p_family_id
    ),
    'total_transactions', (
      SELECT COUNT(*) FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.family_id = p_family_id
    ),
    'total_budgets', (
      SELECT COUNT(*) FROM budgets WHERE family_id = p_family_id
    ),
    'recent_activity', (
      SELECT json_agg(
        json_build_object(
          'type', 'transaction',
          'description', t.descricao,
          'amount', t.valor,
          'date', t.data,
          'user', p.nome
        )
      )
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN family_members fm ON a.user_id = fm.user_id
      JOIN profiles p ON fm.user_id = p.user_id
      WHERE fm.family_id = p_family_id
      ORDER BY t.data DESC
      LIMIT 10
    )
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_family_statistics: %', SQLERRM;
  RETURN json_build_object('error', 'Erro ao obter estatísticas');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_family_transactions()
 RETURNS TABLE(id uuid, user_id uuid, valor numeric, data date, categoria_id uuid, tipo text, descricao character varying, created_at timestamp with time zone, family_id uuid, account_id uuid, goal_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_family_id uuid;
BEGIN
  -- Buscar family_id do utilizador atual (mais eficiente que subquery)
  SELECT fm.family_id INTO v_family_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid()
  LIMIT 1;
  
  -- Se não tem família, retornar vazio
  IF v_family_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.valor,
    t.data,
    t.categoria_id,
    t.tipo,
    t.descricao,
    t.created_at,
    t.family_id,
    t.account_id,
    t.goal_id
  FROM transactions t
  WHERE t.family_id = v_family_id
  ORDER BY t.data DESC, t.created_at DESC
  LIMIT 100; -- Limitar resultados para melhor performance
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_index_usage_stats()
 RETURNS TABLE(index_name text, table_name text, index_size text, index_scans bigint, index_tuples_read bigint, index_tuples_fetched bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname::text,
        t.relname::text,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::text,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_indexes i
    JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
    JOIN pg_stat_user_tables t ON s.relname = t.relname
    WHERE i.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_accounts_with_balances(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, family_id uuid, nome text, tipo text, saldo numeric, saldo_atual numeric, total_reservado numeric, saldo_disponivel numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.family_id,
    a.nome,
    a.tipo,
    a.saldo,
    abwr.saldo_atual,
    abwr.total_reservado,
    abwr.saldo_disponivel,
    a.created_at
  FROM accounts a
  LEFT JOIN account_balances_with_reserved abwr ON abwr.account_id = a.id
  WHERE a.user_id = COALESCE(p_user_id, auth.uid())
    AND a.family_id IS NULL
  ORDER BY a.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_budgets()
 RETURNS TABLE(id uuid, user_id uuid, categoria_id uuid, categoria_nome text, categoria_cor text, mes character varying, valor_orcamento numeric, valor_gasto numeric, valor_restante numeric, progresso_percentual numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    bp.budget_id as id,
    bp.user_id,
    bp.categoria_id,
    bp.categoria_nome,
    bp.categoria_cor,
    bp.mes,
    bp.valor_orcamento,
    bp.valor_gasto,
    bp.valor_restante,
    bp.progresso_percentual
  FROM budget_progress bp
  WHERE bp.user_id = auth.uid()
  ORDER BY bp.mes DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_goals(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, nome text, valor_objetivo numeric, valor_atual numeric, prazo date, ativa boolean, user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get personal goals (family_id IS NULL)
    RETURN QUERY
    SELECT 
      g.id,
      g.nome,
      g.valor_objetivo,
      g.valor_atual,
      g.prazo,
      g.ativa,
      g.user_id,
      g.created_at,
      g.updated_at
    FROM goals g
    WHERE g.user_id = v_user_id
      AND g.family_id IS NULL
    ORDER BY g.created_at DESC;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_kpis()
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id UUID;
  current_month TEXT;
  v_total_balance DECIMAL(10,2) := 0;
  v_credit_card_debt DECIMAL(10,2) := 0;
  v_goals_account_balance DECIMAL(10,2) := 0;
  v_total_goals_value DECIMAL(10,2) := 0;
  v_top_goal_progress DECIMAL(5,2) := 0;
  v_monthly_savings DECIMAL(10,2) := 0;
  v_budget_spent DECIMAL(10,2) := 0;
  v_budget_amount DECIMAL(10,2) := 0;
  v_budget_percentage DECIMAL(5,2) := 0;
  v_goals_progress_percentage DECIMAL(5,2) := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Query 1: Calcular saldos e dívidas de cartão (otimizada)
  SELECT 
    COALESCE(SUM(CASE WHEN a.tipo != 'cartão de crédito' THEN a.saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.tipo = 'cartão de crédito' AND a.saldo < 0 THEN ABS(a.saldo) ELSE 0 END), 0)
  INTO v_total_balance, v_credit_card_debt
  FROM accounts a
  WHERE a.user_id = v_user_id AND a.family_id IS NULL;
  
  -- Query 2: Calcular objetivos (otimizada)
  SELECT 
    COALESCE(SUM(valor_objetivo), 0),
    COALESCE(
      (SELECT a.saldo 
       FROM accounts a 
       WHERE a.user_id = v_user_id 
         AND a.family_id IS NULL 
         AND (LOWER(a.nome) LIKE '%objetivo%' OR LOWER(a.tipo) LIKE '%objetivo%')
       LIMIT 1), 0
    )
  INTO v_total_goals_value, v_goals_account_balance
  FROM goals 
  WHERE user_id = v_user_id AND family_id IS NULL;
  
  -- Calcular percentagem de progresso dos objetivos
  IF v_total_goals_value > 0 THEN
    v_goals_progress_percentage := (v_goals_account_balance / v_total_goals_value) * 100;
  END IF;
  
  -- Query 3: Calcular progresso do objetivo principal
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO v_top_goal_progress
  FROM goals 
  WHERE user_id = v_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Query 4: Calcular poupança mensal (otimizada com índice)
  SELECT 
    COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0)
  INTO v_monthly_savings
  FROM transactions t
  WHERE t.user_id = v_user_id 
    AND t.family_id IS NULL
    AND t.data::text LIKE current_month || '%';
  
  -- Query 5: Calcular orçamentos (ajustada para estrutura real)
  SELECT 
    COALESCE(SUM(b.valor), 0),
    COALESCE(SUM(b.valor), 0) -- Simplificado para teste
  INTO v_budget_amount, v_budget_spent
  FROM budgets b
  WHERE b.user_id = v_user_id 
    AND b.family_id IS NULL
    AND b.mes = current_month;
  
  -- Calcular percentagem de orçamento gasto
  IF v_budget_amount > 0 THEN
    v_budget_percentage := (v_budget_spent / v_budget_amount) * 100;
  END IF;
  
  -- Return results
  RETURN QUERY
  SELECT 
    v_total_balance as total_balance,
    v_credit_card_debt as credit_card_debt,
    v_top_goal_progress as top_goal_progress,
    v_monthly_savings as monthly_savings,
    v_goals_account_balance as goals_account_balance,
    v_total_goals_value as total_goals_value,
    v_goals_progress_percentage as goals_progress_percentage,
    v_budget_spent as total_budget_spent,
    v_budget_amount as total_budget_amount,
    v_budget_percentage as budget_spent_percentage;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_kpis_debug()
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- If no user is authenticated, return zeros
  IF current_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt (bypass RLS)
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM public.accounts 
  WHERE user_id = current_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (bypass RLS)
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM public.accounts 
  WHERE user_id = current_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value (bypass RLS)
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM public.goals 
  WHERE user_id = current_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress (bypass RLS)
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM public.goals 
  WHERE user_id = current_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately (bypass RLS)
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM public.transactions 
  WHERE user_id = current_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately (bypass RLS)
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM public.budget_progress 
  WHERE user_id = current_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_kpis_test(p_user_id uuid)
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
BEGIN
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN QUERY
  SELECT
    -- Total balance (regular accounts only)
    COALESCE(SUM(CASE WHEN a.tipo != 'cartão de crédito' THEN a.saldo ELSE 0 END), 0) as total_balance,
    
    -- Credit card debt
    COALESCE(SUM(CASE WHEN a.tipo = 'cartão de crédito' AND a.saldo < 0 THEN ABS(a.saldo) ELSE 0 END), 0) as credit_card_debt,
    
    -- Top goal progress
    top_goal_prog as top_goal_progress,
    
    -- Monthly savings (simplified calculation)
    COALESCE(SUM(CASE 
      WHEN to_char(t.data, 'YYYY-MM') = current_month AND t.tipo = 'receita' THEN t.valor
      ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
      WHEN to_char(t.data, 'YYYY-MM') = current_month AND t.tipo = 'despesa' THEN t.valor
      ELSE 0 
    END), 0) as monthly_savings,
    
    -- Goals account balance
    goals_account_bal as goals_account_balance,
    
    -- Total goals value
    total_goals_val as total_goals_value,
    
    -- Goals progress percentage
    goals_progress_percentage as goals_progress_percentage,
    
    -- Total budget spent
    COALESCE(SUM(bp.valor_gasto), 0) as total_budget_spent,
    
    -- Total budget amount
    COALESCE(SUM(bp.valor_orcamento), 0) as total_budget_amount,
    
    -- Budget spent percentage
    CASE 
      WHEN COALESCE(SUM(bp.valor_orcamento), 0) > 0 
      THEN (COALESCE(SUM(bp.valor_gasto), 0) / COALESCE(SUM(bp.valor_orcamento), 0)) * 100
      ELSE 0 
    END as budget_spent_percentage
    
  FROM accounts a
  LEFT JOIN transactions t ON t.user_id = p_user_id AND t.family_id IS NULL
  LEFT JOIN budget_progress bp ON bp.user_id = p_user_id
  WHERE a.user_id = p_user_id AND a.family_id IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_kpis_test_fixed(p_user_id uuid)
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
BEGIN
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM accounts 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM transactions 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM budget_progress 
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_kpis_with_user(p_user_id uuid)
 RETURNS TABLE(total_balance numeric, credit_card_debt numeric, top_goal_progress numeric, monthly_savings numeric, goals_account_balance numeric, total_goals_value numeric, goals_progress_percentage numeric, total_budget_spent numeric, total_budget_amount numeric, budget_spent_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
  goals_account_bal DECIMAL(10,2) := 0;
  total_goals_val DECIMAL(10,2) := 0;
  top_goal_prog DECIMAL(5,2) := 0;
  monthly_savings_val DECIMAL(10,2) := 0;
  total_budget_spent_val DECIMAL(10,2) := 0;
  total_budget_amount_val DECIMAL(10,2) := 0;
  total_balance_val DECIMAL(10,2) := 0;
  credit_card_debt_val DECIMAL(10,2) := 0;
BEGIN
  -- If no user is provided, return zeros
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      0.00 as total_balance,
      0.00 as credit_card_debt,
      0.00 as top_goal_progress,
      0.00 as monthly_savings,
      0.00 as goals_account_balance,
      0.00 as total_goals_value,
      0.00 as goals_progress_percentage,
      0.00 as total_budget_spent,
      0.00 as total_budget_amount,
      0.00 as budget_spent_percentage;
    RETURN;
  END IF;
  
  -- Get current month
  current_month := to_char(current_date, 'YYYY-MM');
  
  -- Calculate total balance and credit card debt
  SELECT 
    COALESCE(SUM(CASE WHEN tipo != 'cartão de crédito' THEN saldo ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'cartão de crédito' AND saldo < 0 THEN ABS(saldo) ELSE 0 END), 0)
  INTO total_balance_val, credit_card_debt_val
  FROM accounts 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals account balance (find account named 'objetivo' or with type 'objetivo')
  SELECT COALESCE(saldo, 0) INTO goals_account_bal
  FROM accounts 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND (LOWER(nome) LIKE '%objetivo%' OR LOWER(tipo) LIKE '%objetivo%')
  LIMIT 1;
  
  -- Calculate total goals value
  SELECT COALESCE(SUM(valor_objetivo), 0) INTO total_goals_val
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL;
  
  -- Calculate goals progress percentage
  IF total_goals_val > 0 THEN
    goals_progress_percentage := (goals_account_bal / total_goals_val) * 100;
  ELSE
    goals_progress_percentage := 0;
  END IF;
  
  -- Calculate top goal progress
  SELECT COALESCE(
    ((valor_atual / NULLIF(valor_objetivo, 0)) * 100), 0
  ) INTO top_goal_prog
  FROM goals 
  WHERE user_id = p_user_id AND family_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Calculate monthly savings separately
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
  INTO monthly_savings_val
  FROM transactions 
  WHERE user_id = p_user_id
    AND family_id IS NULL 
    AND to_char(data, 'YYYY-MM') = current_month;
  
  -- Calculate budget values separately
  SELECT 
    COALESCE(SUM(valor_gasto), 0),
    COALESCE(SUM(valor_orcamento), 0)
  INTO total_budget_spent_val, total_budget_amount_val
  FROM budget_progress 
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT
    total_balance_val as total_balance,
    credit_card_debt_val as credit_card_debt,
    top_goal_prog as top_goal_progress,
    monthly_savings_val as monthly_savings,
    goals_account_bal as goals_account_balance,
    total_goals_val as total_goals_value,
    goals_progress_percentage as goals_progress_percentage,
    total_budget_spent_val as total_budget_spent,
    total_budget_amount_val as total_budget_amount,
    CASE 
      WHEN total_budget_amount_val > 0 
      THEN (total_budget_spent_val / total_budget_amount_val) * 100
      ELSE 0 
    END as budget_spent_percentage;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_transactions()
 RETURNS TABLE(id uuid, user_id uuid, valor numeric, data date, categoria_id uuid, tipo text, descricao character varying, created_at timestamp with time zone, family_id uuid, account_id uuid, goal_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.valor,
    t.data,
    t.categoria_id,
    t.tipo,
    t.descricao,
    t.created_at,
    t.family_id,
    t.account_id,
    t.goal_id
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.family_id IS NULL
  ORDER BY t.data DESC, t.created_at DESC
  LIMIT 100; -- Limitar resultados para melhor performance
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_personal_transactions_fast()
 RETURNS TABLE(id uuid, user_id uuid, valor numeric, data date, categoria_id uuid, tipo text, descricao character varying, created_at timestamp with time zone, family_id uuid, account_id uuid, goal_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH user_transactions AS (
    SELECT t.*
    FROM transactions t
    WHERE t.user_id = auth.uid()
      AND t.family_id IS NULL
  )
  SELECT 
    ut.id,
    ut.user_id,
    ut.valor,
    ut.data,
    ut.categoria_id,
    ut.tipo,
    ut.descricao,
    ut.created_at,
    ut.family_id,
    ut.account_id,
    ut.goal_id
  FROM user_transactions ut
  ORDER BY ut.data DESC, ut.created_at DESC
  LIMIT 50; -- Reduzir ainda mais para melhor performance
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_account_balances()
 RETURNS TABLE(account_id uuid, nome text, user_id uuid, saldo_atual numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    ab.account_id,
    ab.nome,
    ab.user_id,
    ab.saldo_atual
  from account_balances ab
  where ab.user_id = auth.uid();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_account_reserved()
 RETURNS TABLE(account_id uuid, total_reservado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    ar.account_id,
    ar.total_reservado
  from account_reserved ar
  where exists (
    select 1 from accounts a 
    where a.id = ar.account_id 
    and a.user_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_accounts_with_balances()
 RETURNS TABLE(account_id uuid, nome text, user_id uuid, tipo text, saldo_atual numeric, total_reservado numeric, saldo_disponivel numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Get accounts with balances for the current user
  RETURN QUERY
  SELECT 
    a.id as account_id,
    a.nome,
    a.user_id,
    a.tipo,
    COALESCE(ab.saldo_atual, 0) as saldo_atual,
    COALESCE(ar.total_reservado, 0) as total_reservado,
    COALESCE(ab.saldo_atual, 0) - COALESCE(ar.total_reservado, 0) as saldo_disponivel
  FROM accounts a
  LEFT JOIN account_balances ab ON ab.account_id = a.id
  LEFT JOIN account_reserved ar ON ar.account_id = a.id
  WHERE a.user_id = auth.uid()
  ORDER BY a.nome;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_accounts_with_balances(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(account_id uuid, nome text, user_id uuid, tipo text, saldo_atual numeric, total_reservado numeric, saldo_disponivel numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Use provided user_id or fall back to auth.uid()
  DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
  BEGIN
    -- Get accounts with balances for the specified user using the new view
    RETURN QUERY
    SELECT 
      abwr.account_id,
      abwr.nome,
      abwr.user_id,
      a.tipo,
      abwr.saldo_total as saldo_atual,
      abwr.total_reservado,
      abwr.saldo_disponivel
    FROM account_balances_with_reserved abwr
    JOIN accounts a ON a.id = abwr.account_id
    WHERE abwr.user_id = v_user_id
    ORDER BY abwr.nome;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_all_transactions()
 RETURNS TABLE(id uuid, valor numeric, tipo text, data date, descricao character varying, user_id uuid, family_id uuid, categoria_id uuid, account_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  -- Get the current user ID from auth context
  RETURN QUERY
  SELECT 
      t.id,
      t.valor,
      t.tipo,
      t.data,
      t.descricao,
      t.user_id,
      t.family_id,
      t.categoria_id,
      t.account_id
  FROM transactions t
  WHERE (
      -- Personal transactions (user's own transactions)
      (t.user_id = auth.uid() AND t.family_id IS NULL)
      OR
      -- Family transactions (transactions from user's families)
      (t.family_id IS NOT NULL AND t.family_id IN (
          SELECT fm.family_id
          FROM family_members fm
          WHERE fm.user_id = auth.uid()
      ))
  )
  ORDER BY t.data DESC, t.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_all_transactions(p_user_id uuid)
 RETURNS TABLE(id uuid, valor numeric, tipo text, data date, descricao text, modo text, user_id uuid, family_id uuid, categoria_id uuid)
 LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  RETURN QUERY
  SELECT 
      t.id,
      t.valor,
      t.tipo,
      t.data,
      t.descricao,
      t.modo,
      t.user_id,
      t.family_id,
      t.categoria_id
  FROM transactions t
  WHERE (
      (t.user_id = p_user_id AND t.family_id IS NULL)
      OR
      (t.family_id IS NOT NULL AND t.family_id IN (
          SELECT get_user_families(p_user_id)
      ))
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_budget_progress()
 RETURNS TABLE(budget_id uuid, categoria_id uuid, categoria_nome text, categoria_cor text, valor_orcamento numeric, valor_gasto numeric, valor_restante numeric, progresso_percentual numeric, mes character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        bp.budget_id,
        bp.categoria_id,
        bp.categoria_nome,
        bp.categoria_cor,
        bp.valor_orcamento,
        bp.valor_gasto,
        bp.valor_restante,
        bp.progresso_percentual,
        bp.mes
    FROM budget_progress bp
    WHERE bp.user_id = auth.uid()
    ORDER BY bp.mes DESC, bp.categoria_nome;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_families()
 RETURNS TABLE(family_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Ensure we're using the correct search path
  SET search_path = public, pg_temp;
  
  RETURN QUERY
  SELECT fm.family_id
  FROM family_members fm
  WHERE fm.user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_families(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  RETURN QUERY
  SELECT family_id
  FROM family_members
  WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_family_data()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'null'::json;
  END IF;

  BEGIN
    SELECT json_build_object(
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      ),
      'user_role', fm.role,
      'member_count', (
        SELECT COUNT(*) 
        FROM family_members fm2 
        WHERE fm2.family_id = f.id
      ),
      'pending_invites_count', (
        SELECT COUNT(*) 
        FROM family_invites fi 
        WHERE fi.family_id = f.id AND fi.status = 'pending'
      ),
      'shared_goals_count', (
        SELECT COUNT(*) 
        FROM goals g 
        WHERE g.family_id = f.id
      )
    ) INTO v_result
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.user_id = v_user_id
    LIMIT 1;
    
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    ELSE
      RETURN 'null'::json;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_user_family_data: %', SQLERRM;
    RETURN 'null'::json;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_family_data(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  BEGIN
    SELECT json_build_object(
      'success', true,
      'family_member', json_build_object(
        'id', fm.id,
        'user_id', fm.user_id,
        'family_id', fm.family_id,
        'role', fm.role,
        'permissions', fm.permissions,
        'joined_at', fm.joined_at
      ),
      'family', json_build_object(
        'id', f.id,
        'nome', f.nome,
        'description', f.description,
        'created_by', f.created_by,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'settings', f.settings
      ),
      'profile', json_build_object(
        'nome', COALESCE(p.nome, 'Utilizador'),
        'email', COALESCE(au.email, '')
      )
    ) INTO v_result
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    LEFT JOIN profiles p ON fm.user_id = p.user_id
    LEFT JOIN auth.users au ON fm.user_id = au.id
    WHERE fm.user_id = p_user_id
    LIMIT 1;
    IF v_result IS NOT NULL THEN
      RETURN json_build_array(v_result);
    ELSE
      RETURN '[]'::json;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em get_user_family_data: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Erro interno do servidor');
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_financial_summary()
 RETURNS TABLE(total_saldo_contas numeric, total_reservado_objetivos numeric, total_saldo_disponivel numeric, total_contas bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        fs.total_saldo_contas,
        fs.total_reservado_objetivos,
        fs.total_saldo_disponivel,
        fs.total_contas
    FROM financial_summary fs
    WHERE fs.user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_goal_progress()
 RETURNS TABLE(goal_id uuid, nome text, valor_objetivo numeric, total_alocado numeric, progresso_percentual numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    gp.goal_id,
    gp.nome,
    gp.valor_objetivo,
    gp.total_alocado,
    gp.progresso_percentual
  from goal_progress gp
  where exists (
    select 1 from goals g 
    where g.id = gp.goal_id 
    and g.user_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_pending_family_invites()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_email text;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Obter email do utilizador
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Obter convites pendentes
  SELECT json_agg(
    json_build_object(
      'id', fi.id,
      'family_id', fi.family_id,
      'family_name', f.nome,
      'email', fi.email,
      'role', fi.role,
      'status', fi.status,
      'invited_by', fi.invited_by,
      'created_at', fi.created_at,
      'expires_at', fi.expires_at
    )
  ) INTO v_result
  FROM family_invites fi
  JOIN families f ON fi.family_id = f.id
  WHERE fi.email = v_user_email AND fi.status = 'pending'
  ORDER BY fi.created_at DESC;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em get_user_pending_family_invites: %', SQLERRM;
  RETURN '[]'::json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_transactions_detailed(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_account_id uuid DEFAULT NULL::uuid, p_categoria_id uuid DEFAULT NULL::uuid, p_tipo text DEFAULT NULL::text, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, valor numeric, data date, tipo text, descricao character varying, created_at timestamp with time zone, account_id uuid, account_nome text, account_tipo text, categoria_id uuid, categoria_nome text, categoria_cor text, goal_id uuid, goal_nome text, family_id uuid, family_nome text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        td.id,
        td.valor,
        td.data,
        td.tipo,
        td.descricao,
        td.created_at,
        td.account_id,
        td.account_nome,
        td.account_tipo,
        td.categoria_id,
        td.categoria_nome,
        td.categoria_cor,
        td.goal_id,
        td.goal_nome,
        td.family_id,
        td.family_nome
    FROM transactions_detailed td
    WHERE td.user_id = auth.uid()
        AND (p_account_id IS NULL OR td.account_id = p_account_id)
        AND (p_categoria_id IS NULL OR td.categoria_id = p_categoria_id)
        AND (p_tipo IS NULL OR td.tipo = p_tipo)
        AND (p_data_inicio IS NULL OR td.data >= p_data_inicio)
        AND (p_data_fim IS NULL OR td.data <= p_data_fim)
    ORDER BY td.data DESC, td.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$
;

create or replace view "public"."goal_progress" as  SELECT g.id AS goal_id,
    g.nome,
    g.valor_objetivo,
    COALESCE(sum(ga.valor), (0)::numeric) AS total_alocado,
    round(((COALESCE(sum(ga.valor), (0)::numeric) / NULLIF(g.valor_objetivo, (0)::numeric)) * (100)::numeric), 2) AS progresso_percentual
   FROM (goals g
     LEFT JOIN goal_allocations ga ON ((ga.goal_id = g.id)))
  GROUP BY g.id, g.nome, g.valor_objetivo;


CREATE OR REPLACE FUNCTION public.handle_budget_exceeded()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_category_name text;
  v_user_name text;
  v_budget_amount numeric;
  v_spent_amount numeric;
  v_progress_percent numeric;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Calcular gasto real para este orçamento
  SELECT 
    b.valor,
    COALESCE(SUM(t.valor), 0),
    CASE 
      WHEN b.valor > 0 THEN (COALESCE(SUM(t.valor), 0) / b.valor) * 100
      ELSE 0
    END
  INTO v_budget_amount, v_spent_amount, v_progress_percent
  FROM budgets b
  LEFT JOIN transactions t ON t.categoria_id = b.categoria_id 
    AND t.user_id = b.user_id
    AND DATE_TRUNC('month', t.data::date) = DATE_TRUNC('month', b.mes::date)
  WHERE b.id = NEW.id
  GROUP BY b.valor;
  
  -- Se o orçamento foi excedido (mais de 100%)
  IF v_progress_percent > 100 THEN
    -- Obter nome da família (através do utilizador)
    SELECT f.nome INTO v_family_name
    FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.user_id = NEW.user_id
    LIMIT 1;
    
    -- Obter nome da categoria
    SELECT nome INTO v_category_name
    FROM categories
    WHERE id = NEW.categoria_id;
    
    -- Obter nome do utilizador
    SELECT nome INTO v_user_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      (SELECT family_id FROM family_members WHERE user_id = NEW.user_id LIMIT 1),
      NEW.user_id,
      'Orçamento Excedido',
      'O orçamento de ' || v_category_name || ' foi excedido em ' || v_progress_percent || '% (' || v_spent_amount || '€ de ' || v_budget_amount || '€)',
      'error',
      'budget',
      jsonb_build_object(
        'budget_id', NEW.id,
        'category_name', v_category_name,
        'budget_amount', v_budget_amount,
        'spent_amount', v_spent_amount,
        'progress_percent', v_progress_percent,
        'user_name', v_user_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_credit_card_account(p_account_id uuid, p_user_id uuid, p_operation text DEFAULT 'create'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
BEGIN
  -- Verificar se a conta existe e é um cartão de crédito
  SELECT * INTO v_account
  FROM accounts 
  WHERE id = p_account_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;
  
  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;
  
  -- Lógica específica para cartões de crédito
  CASE p_operation
    WHEN 'create' THEN
      -- Para cartões de crédito, o saldo inicial deve ser 0 ou negativo (débito)
      IF v_account.saldo > 0 THEN
        UPDATE accounts 
        SET saldo = 0 
        WHERE id = p_account_id;
      END IF;
      
      v_result := jsonb_build_object(
        'success', true,
        'message', 'Cartão de crédito criado com saldo inicial ajustado para 0',
        'account_name', v_account.nome
      );
      
    WHEN 'update' THEN
      -- Para cartões de crédito, manter lógica de saldo
      v_result := jsonb_build_object(
        'success', true,
        'message', 'Cartão de crédito atualizado',
        'account_name', v_account.nome
      );
      
    ELSE
      v_result := jsonb_build_object(
        'success', false,
        'error', 'Operação não suportada'
      );
  END CASE;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao processar cartão de crédito: ' || SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_credit_card_transaction(p_user_id uuid, p_account_id uuid, p_valor numeric, p_data date, p_categoria_id uuid, p_tipo text, p_descricao text DEFAULT NULL::text, p_goal_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Verificar se a conta existe e é um cartão de crédito
  SELECT * INTO v_account
  FROM accounts 
  WHERE id = p_account_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;
  
  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;
  
  -- Verificar se a categoria existe
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_categoria_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Categoria não encontrada'
    );
  END IF;
  
  -- Verificar se o valor é válido
  IF p_valor <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'O valor deve ser maior que zero'
    );
  END IF;
  
  -- Lógica específica para cartões de crédito
  BEGIN
    -- Para cartões de crédito:
    -- - DESPESAS: aumentam a dívida (saldo fica mais negativo)
    -- - RECEITAS: diminuem a dívida (saldo fica menos negativo ou positivo)
    
    CASE p_tipo
      WHEN 'despesa' THEN
        -- Despesa aumenta a dívida (saldo fica mais negativo)
        v_new_balance := v_account.saldo - p_valor;
        
      WHEN 'receita' THEN
        -- Receita diminui a dívida (saldo fica menos negativo ou positivo)
        v_new_balance := v_account.saldo + p_valor;
        
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Tipo de transação inválido para cartão de crédito'
        );
    END CASE;
    
    -- Criar a transação
    INSERT INTO transactions (
      user_id,
      account_id,
      valor,
      data,
      categoria_id,
      tipo,
      descricao,
      goal_id
    ) VALUES (
      p_user_id,
      p_account_id,
      p_valor,
      p_data,
      p_categoria_id,
      p_tipo,
      COALESCE(p_descricao, 'Transação em cartão de crédito'),
      p_goal_id
    ) RETURNING id INTO v_transaction_id;
    
    -- Atualizar o saldo da conta
    UPDATE accounts 
    SET saldo = v_new_balance 
    WHERE id = p_account_id;
    
    -- Retornar sucesso
    v_result := jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'old_balance', v_account.saldo,
      'new_balance', v_new_balance,
      'transaction_type', p_tipo,
      'amount', p_valor,
      'message', CASE 
        WHEN p_tipo = 'despesa' THEN 'Despesa registada - dívida aumentou'
        WHEN p_tipo = 'receita' THEN 'Receita registada - dívida diminuiu'
      END
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro ao processar transação de cartão de crédito: ' || SQLERRM
      );
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_large_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_account_name text;
  v_category_name text;
  v_user_name text;
  v_threshold numeric := 1000; -- Limite de 1000€ para notificação
BEGIN
  SET search_path = public, pg_temp;
  
  -- Só processar se for uma transação familiar e o valor for alto
  IF NEW.family_id IS NOT NULL AND NEW.valor > v_threshold THEN
    -- Obter nome da família
    SELECT nome INTO v_family_name
    FROM families
    WHERE id = NEW.family_id;
    
    -- Obter nome da conta
    SELECT nome INTO v_account_name
    FROM accounts
    WHERE id = NEW.account_id;
    
    -- Obter nome da categoria
    SELECT nome INTO v_category_name
    FROM categories
    WHERE id = NEW.categoria_id;
    
    -- Obter nome do utilizador
    SELECT nome INTO v_user_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      NEW.family_id,
      NEW.user_id,
      'Transação Grande',
      v_user_name || ' fez uma transação de ' || NEW.valor || '€ em ' || v_account_name || ' (' || v_category_name || ')',
      'warning',
      'transaction',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.valor,
        'account_name', v_account_name,
        'category_name', v_category_name,
        'user_name', v_user_name,
        'date', NEW.data
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_member_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = OLD.family_id;
  
  -- Obter nome do membro
  SELECT nome INTO v_member_name
  FROM profiles
  WHERE user_id = OLD.user_id;
  
  -- Criar notificação
  PERFORM create_family_notification(
    OLD.family_id,
    OLD.user_id,
    'Membro Removido',
    v_member_name || ' foi removido da família ' || v_family_name,
    'warning',
    'member',
    jsonb_build_object(
      'member_id', OLD.user_id,
      'member_name', v_member_name,
      'role', OLD.role
    )
  );
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_member_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Só processar se o papel mudou
  IF OLD.role != NEW.role THEN
    -- Obter nome da família
    SELECT nome INTO v_family_name
    FROM families
    WHERE id = NEW.family_id;
    
    -- Obter nome do membro
    SELECT nome INTO v_member_name
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Criar notificação
    PERFORM create_family_notification(
      NEW.family_id,
      NEW.user_id,
      'Mudança de Papel',
      v_member_name || ' foi promovido para ' || NEW.role || ' na família ' || v_family_name,
      'info',
      'member',
      jsonb_build_object(
        'member_id', NEW.user_id,
        'member_name', v_member_name,
        'old_role', OLD.role,
        'new_role', NEW.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_family_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_member_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = NEW.family_id;
  
  -- Obter nome do membro
  SELECT nome INTO v_member_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Criar notificação
  PERFORM create_family_notification(
    NEW.family_id,
    NEW.user_id,
    'Novo Membro da Família',
    v_member_name || ' juntou-se à família ' || v_family_name,
    'success',
    'member',
    jsonb_build_object(
      'member_id', NEW.user_id,
      'member_name', v_member_name,
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_family_name text;
  v_inviter_name text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter nome da família
  SELECT nome INTO v_family_name
  FROM families
  WHERE id = NEW.family_id;
  
  -- Obter nome de quem convidou
  SELECT nome INTO v_inviter_name
  FROM profiles
  WHERE user_id = NEW.invited_by;
  
  -- Criar notificação para o convite
  PERFORM create_family_notification(
    NEW.family_id,
    NEW.invited_by,
    'Novo Convite Enviado',
    v_inviter_name || ' convidou ' || NEW.email || ' para a família ' || v_family_name,
    'info',
    'invite',
    jsonb_build_object(
      'invite_id', NEW.id,
      'invite_email', NEW.email,
      'invite_role', NEW.role,
      'inviter_name', v_inviter_name
    )
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invite_family_member_by_email(p_family_id uuid, p_email text, p_role text DEFAULT 'member'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role text;
  v_invite_id uuid;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem convidar membros';
  END IF;

  -- Verificar se já existe um convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM family_invites 
    WHERE family_id = p_family_id AND email = p_email AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este email';
  END IF;

  -- Verificar se o utilizador já é membro da família
  IF EXISTS (
    SELECT 1 FROM family_members fm
    JOIN auth.users au ON fm.user_id = au.id
    WHERE fm.family_id = p_family_id AND au.email = p_email
  ) THEN
    RAISE EXCEPTION 'Utilizador já é membro desta família';
  END IF;

  -- Criar o convite
  INSERT INTO family_invites (family_id, email, role, status, invited_by, expires_at)
  VALUES (p_family_id, p_email, p_role, 'pending', v_user_id, NOW() + INTERVAL '7 days')
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Convite enviado com sucesso',
    'invite_id', v_invite_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em invite_family_member_by_email: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao enviar convite';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_permission_check(p_operation text, p_table_name text, p_result boolean, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  INSERT INTO debug_logs (operation, table_name, user_id, result, details)
  VALUES (p_operation, p_table_name, auth.uid(), p_result, p_details);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_permission_check(p_operation text, p_table_name text, p_user_id uuid, p_result boolean, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Log apenas em ambiente de desenvolvimento
    IF current_setting('app.environment', true) = 'development' THEN
        INSERT INTO public.debug_logs (
            operation,
            table_name,
            user_id,
            result,
            details,
            created_at
        ) VALUES (
            p_operation,
            p_table_name,
            p_user_id,
            p_result,
            p_details,
            NOW()
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar erros de logging para não afetar operações principais
    NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_permission_check(p_operation text, p_table_name text, p_user_id uuid, p_result text, p_details json)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  IF current_setting('app.environment', true) = 'development' THEN
      INSERT INTO public.debug_logs (
          operation,
          table_name,
          user_id,
          result,
          details,
          created_at
      ) VALUES (
          p_operation,
          p_table_name,
          p_user_id,
          p_result,
          p_details,
          NOW()
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.manage_credit_card_balance(p_user_id uuid, p_account_id uuid, p_new_balance numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_category_id UUID;
  v_current_expenses NUMERIC := 0;
  v_current_payments NUMERIC := 0;
  v_new_expenses NUMERIC := 0;
  v_new_payments NUMERIC := 0;
  v_adjustment_amount NUMERIC := 0;
  v_current_balance_from_totals NUMERIC := 0;
BEGIN
  -- Verificar se a conta existe e é um cartão de crédito
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;

  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;

  -- Convert positive values to negative for credit cards
  IF p_new_balance > 0 THEN
    p_new_balance := -p_new_balance;
  END IF;

  -- Get current totals from ALL transactions (including adjustments)
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
  INTO v_current_expenses, v_current_payments
  FROM transactions
  WHERE account_id = p_account_id;

  -- Calculate current balance from these totals
  v_current_balance_from_totals := v_current_payments - v_current_expenses;

  -- Buscar ou criar categoria "Ajuste"
  SELECT id INTO v_category_id FROM categories
  WHERE nome = 'Ajuste' AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO categories (nome, user_id, cor)
    VALUES ('Ajuste', p_user_id, '#6B7280')
    RETURNING id INTO v_category_id;
  END IF;

  -- Special credit card logic
  IF p_new_balance = 0 THEN
    -- RESET EVERYTHING - NEW CYCLE
    -- Delete ALL transactions for this account (clean slate)
    DELETE FROM transactions 
    WHERE account_id = p_account_id;
    
    -- Reset totals to zero
    v_new_expenses := 0;
    v_new_payments := 0;
    
    -- Update account saldo to 0
    UPDATE accounts
    SET saldo = 0
    WHERE id = p_account_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Saldo zerado - Novo ciclo iniciado',
      'previous_balance', v_account.saldo,
      'new_balance', 0,
      'previous_expenses', v_current_expenses,
      'new_expenses', 0,
      'previous_payments', v_current_payments,
      'new_payments', 0,
      'cycle_reset', true
    );

    RETURN v_result;
  ELSE
    -- Clear all existing adjustment transactions (but keep real transactions)
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';

    -- SIMPLE LOGIC: 
    -- If reducing debt (balance less negative), increase payments
    -- If increasing debt (balance more negative), increase expenses
    -- If balance is 0, everything is 0
    
    IF p_new_balance > v_current_balance_from_totals THEN
      -- Reducing debt: keep expenses, increase payments
      v_new_expenses := v_current_expenses;
      v_new_payments := v_current_payments + (p_new_balance - v_current_balance_from_totals);
    ELSIF p_new_balance < v_current_balance_from_totals THEN
      -- Increasing debt: increase expenses, keep payments
      v_new_expenses := v_current_expenses + (v_current_balance_from_totals - p_new_balance);
      v_new_payments := v_current_payments;
    ELSE
      -- No change needed
      v_new_expenses := v_current_expenses;
      v_new_payments := v_current_payments;
    END IF;

    -- Create adjustment transaction for expenses if needed
    IF v_new_expenses != v_current_expenses THEN
      v_adjustment_amount := v_new_expenses - v_current_expenses;
      INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
      VALUES (
        p_user_id,
        p_account_id,
        v_category_id,
        ABS(v_adjustment_amount),
        CASE WHEN v_adjustment_amount > 0 THEN 'despesa' ELSE 'receita' END,
        CURRENT_DATE,
        'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar gastos para ' ELSE 'Reduzir gastos para ' END || v_new_expenses || '€'
      );
    END IF;

    -- Create adjustment transaction for payments if needed
    IF v_new_payments != v_current_payments THEN
      v_adjustment_amount := v_new_payments - v_current_payments;
      INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
      VALUES (
        p_user_id,
        p_account_id,
        v_category_id,
        ABS(v_adjustment_amount),
        CASE WHEN v_adjustment_amount > 0 THEN 'receita' ELSE 'despesa' END,
        CURRENT_DATE,
        'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar pagamentos para ' ELSE 'Reduzir pagamentos para ' END || v_new_payments || '€'
      );
    END IF;

    -- Update account saldo
    UPDATE accounts
    SET saldo = p_new_balance
    WHERE id = p_account_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Saldo do cartão de crédito atualizado com sucesso',
      'previous_balance', v_account.saldo,
      'new_balance', p_new_balance,
      'previous_expenses', v_current_expenses,
      'new_expenses', v_new_expenses,
      'previous_payments', v_current_payments,
      'new_payments', v_new_payments,
      'cycle_reset', false
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao atualizar saldo: ' || SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_family_member(p_family_id uuid, p_member_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role text;
  v_member_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  -- Verificar se o membro a remover é owner
  SELECT role INTO v_member_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = p_member_user_id;
  
  IF v_member_role = 'owner' THEN
    RAISE EXCEPTION 'Não é possível remover o proprietário da família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover membros';
  END IF;

  -- Remover o membro
  DELETE FROM family_members 
  WHERE family_id = p_family_id AND user_id = p_member_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Membro removido com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em remove_family_member: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao remover membro';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_family_backup(p_backup_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_backup_record RECORD;
  v_family_id UUID;
  v_backup_data JSONB;
  v_result JSON;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o backup existe e se o utilizador tem permissão
  SELECT fb.*, f.nome as family_name INTO v_backup_record
  FROM family_backups fb
  JOIN families f ON f.id = fb.family_id
  JOIN family_members fm ON fm.family_id = f.id
  WHERE fb.id = p_backup_id 
    AND fm.user_id = v_user_id
    AND fm.role IN ('owner', 'admin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup não encontrado ou não tem permissão para restaurar';
  END IF;

  IF v_backup_record.status != 'completed' THEN
    RAISE EXCEPTION 'Backup não está completo e não pode ser restaurado';
  END IF;

  v_family_id := v_backup_record.family_id;

  -- Em produção, aqui carregaríamos os dados do storage
  -- Por agora, vamos apenas simular a restauração
  
  -- Criar notificação de restauração iniciada
  PERFORM create_family_notification(
    v_family_id,
    v_user_id,
    'Restauração Iniciada',
    'A restauração do backup foi iniciada',
    'info',
    'backup',
    jsonb_build_object(
      'backup_id', p_backup_id,
      'backup_date', v_backup_record.created_at
    )
  );

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'backup_id', p_backup_id,
    'family_id', v_family_id,
    'family_name', v_backup_record.family_name,
    'message', 'Restauração iniciada com sucesso'
  ) INTO v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao restaurar backup: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_credit_card_balance(p_user_id uuid, p_account_id uuid, p_new_balance numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_account RECORD;
  v_category_id UUID;
  v_current_total_expenses NUMERIC := 0;
  v_current_total_payments NUMERIC := 0;
  v_new_total_expenses NUMERIC := 0;
  v_new_total_payments NUMERIC := 0;
  v_adjustment_amount NUMERIC := 0;
  v_current_balance_from_totals NUMERIC := 0;
BEGIN
  -- Verificar se a conta existe e é um cartão de crédito
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conta não encontrada ou não pertence ao utilizador'
    );
  END IF;

  IF v_account.tipo != 'cartão de crédito' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta função só se aplica a cartões de crédito'
    );
  END IF;

  -- Convert positive values to negative for credit cards
  -- If user enters 300, it should become -300
  IF p_new_balance > 0 THEN
    p_new_balance := -p_new_balance;
  END IF;

  -- Get current totals including adjustments (for calculation purposes)
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
  INTO v_current_total_expenses, v_current_total_payments
  FROM transactions
  WHERE account_id = p_account_id;

  -- Calculate current balance from these totals
  v_current_balance_from_totals := v_current_total_payments - v_current_total_expenses;

  -- If the account's stored saldo is 0, then the current totals for calculation should also be 0
  -- This handles the case where the card was previously zeroed out
  IF v_account.saldo = 0 THEN
    v_current_total_expenses := 0;
    v_current_total_payments := 0;
    v_current_balance_from_totals := 0;
  END IF;

  -- Buscar ou criar categoria "Ajuste"
  SELECT id INTO v_category_id FROM categories
  WHERE nome = 'Ajuste' AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO categories (nome, user_id, cor)
    VALUES ('Ajuste', p_user_id, '#6B7280')
    RETURNING id INTO v_category_id;
  END IF;

  -- Logic based on new balance
  IF p_new_balance = 0 THEN
    -- If new balance is 0, zero out both totals
    v_new_total_expenses := 0;
    v_new_total_payments := 0;
    
    -- Clear all adjustment transactions
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';
  ELSE
    -- If new balance is not 0, adjust totals to match the new balance
    -- The goal is: v_new_total_payments - v_new_total_expenses = p_new_balance
    -- Since p_new_balance is negative, we need: v_new_total_expenses - v_new_total_payments = ABS(p_new_balance)
    
    -- Calculate the difference needed
    DECLARE
      v_balance_difference NUMERIC := p_new_balance - v_current_balance_from_totals;
    BEGIN
      IF v_balance_difference < 0 THEN
        -- Need to increase expenses (or decrease payments)
        -- Prefer to increase expenses to create debt
        v_new_total_expenses := v_current_total_expenses + ABS(v_balance_difference);
        v_new_total_payments := v_current_total_payments;
      ELSIF v_balance_difference > 0 THEN
        -- Need to increase payments (or decrease expenses)
        -- Prefer to increase payments to reduce debt
        v_new_total_payments := v_current_total_payments + v_balance_difference;
        v_new_total_expenses := v_current_total_expenses;
      ELSE
        -- No change needed
        v_new_total_expenses := v_current_total_expenses;
        v_new_total_payments := v_current_total_payments;
      END IF;
    END;
    
    -- Clear existing adjustment transactions and create new ones
    DELETE FROM transactions 
    WHERE account_id = p_account_id 
    AND descricao LIKE 'Ajuste de saldo%';
  END IF;

  -- Create adjustment transactions to reach new totals
  -- Adjust expenses
  IF v_new_total_expenses != v_current_total_expenses THEN
    v_adjustment_amount := v_new_total_expenses - v_current_total_expenses;
    INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
    VALUES (
      p_user_id,
      p_account_id,
      v_category_id,
      ABS(v_adjustment_amount),
      CASE WHEN v_adjustment_amount > 0 THEN 'despesa' ELSE 'receita' END,
      CURRENT_DATE,
      'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar gastos para ' ELSE 'Reduzir gastos para ' END || v_new_total_expenses || '€'
    );
  END IF;

  -- Adjust payments
  IF v_new_total_payments != v_current_total_payments THEN
    v_adjustment_amount := v_new_total_payments - v_current_total_payments;
    INSERT INTO transactions (user_id, account_id, categoria_id, valor, tipo, data, descricao)
    VALUES (
      p_user_id,
      p_account_id,
      v_category_id,
      ABS(v_adjustment_amount),
      CASE WHEN v_adjustment_amount > 0 THEN 'receita' ELSE 'despesa' END,
      CURRENT_DATE,
      'Ajuste de saldo: ' || CASE WHEN v_adjustment_amount > 0 THEN 'Aumentar pagamentos para ' ELSE 'Reduzir pagamentos para ' END || v_new_total_payments || '€'
    );
  END IF;

  -- Update account saldo
  UPDATE accounts
  SET saldo = p_new_balance
  WHERE id = p_account_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Saldo do cartão de crédito atualizado com sucesso',
    'previous_balance', v_account.saldo,
    'new_balance', p_new_balance,
    'previous_total_expenses', v_current_total_expenses,
    'new_total_expenses', v_new_total_expenses,
    'previous_total_payments', v_current_total_payments,
    'new_total_payments', v_new_total_payments,
    'balance_difference', p_new_balance - v_current_balance_from_totals
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao atualizar saldo: ' || SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_id_from_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_auth_context()
 RETURNS TABLE(current_user_id uuid, has_auth_context boolean, test_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as current_user_id,
    (auth.uid() IS NOT NULL) as has_auth_context,
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 'Auth context is working'
      ELSE 'No auth context - this is normal when called via MCP'
    END as test_message;
END;
$function$
;

create or replace view "public"."transactions_detailed" as  SELECT t.id,
    t.user_id,
    t.valor,
    t.data,
    t.tipo,
    t.descricao,
    t.created_at,
    t.family_id,
    t.account_id,
    t.goal_id,
    a.nome AS account_nome,
    a.tipo AS account_tipo,
    c.nome AS categoria_nome,
    c.cor AS categoria_cor,
    g.nome AS goal_nome,
    f.nome AS family_nome
   FROM ((((transactions t
     LEFT JOIN accounts a ON ((t.account_id = a.id)))
     LEFT JOIN categories c ON ((t.categoria_id = c.id)))
     LEFT JOIN goals g ON ((t.goal_id = g.id)))
     LEFT JOIN families f ON ((t.family_id = f.id)));


CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_account_balance(account_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    calculated_balance DECIMAL(15,2) := 0;
BEGIN
    -- Calcular o saldo total das transações
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo = 'receita' THEN valor 
            WHEN tipo = 'despesa' THEN -valor
            WHEN tipo = 'transferencia' THEN 0 -- Transferências não afetam o saldo calculado
            ELSE -valor -- Fallback para outros tipos
        END
    ), 0) INTO calculated_balance
    FROM transactions 
    WHERE account_id = account_id_param;
    
    -- Atualizar o saldo na conta
    UPDATE accounts 
    SET saldo = calculated_balance 
    WHERE id = account_id_param;
    
    RAISE NOTICE 'Saldo da conta % atualizado para: %', account_id_param, calculated_balance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_family_settings(p_family_id uuid, p_nome text, p_description text DEFAULT NULL::text, p_settings jsonb DEFAULT NULL::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  -- Obter o ID do utilizador atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilizador não autenticado');
  END IF;
  
  -- Verificar se o utilizador é owner da família
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id 
    AND user_id = v_user_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN json_build_object('success', false, 'message', 'Apenas o dono da família pode alterar estas configurações');
  END IF;
  
  -- Atualizar as configurações da família
  UPDATE families 
  SET 
    nome = p_nome,
    description = p_description,
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_family_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Configurações atualizadas com sucesso',
    'family_id', p_family_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_goal_allocations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_member_role(p_family_id uuid, p_member_user_id uuid, p_new_role text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role text;
BEGIN
  SET search_path = public, pg_temp;
  
  -- Obter o ID do utilizador autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Verificar se o utilizador é admin da família
  SELECT role INTO v_user_role
  FROM family_members 
  WHERE family_id = p_family_id AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: utilizador não é membro desta família';
  END IF;
  
  IF v_user_role != 'owner' AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar roles';
  END IF;

  -- Atualizar o role
  UPDATE family_members 
  SET role = p_new_role
  WHERE family_id = p_family_id AND user_id = p_member_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  RETURN json_build_object('success', true, 'message', 'Role atualizado com sucesso');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro em update_member_role: %', SQLERRM;
  RAISE EXCEPTION 'Erro ao atualizar role';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_family_permission(p_family_id uuid, p_required_role text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_user_role text;
    v_has_permission boolean := false;
BEGIN
    SET search_path = public, pg_temp;
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    SELECT role INTO v_user_role
    FROM family_members
    WHERE family_id = p_family_id AND user_id = v_user_id;
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;
    CASE p_required_role
        WHEN 'owner' THEN
            v_has_permission := (v_user_role = 'owner');
        WHEN 'admin' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin'));
        WHEN 'member' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin', 'member'));
        WHEN 'viewer' THEN
            v_has_permission := (v_user_role IN ('owner', 'admin', 'member', 'viewer'));
        ELSE
            v_has_permission := false;
    END CASE;
    RETURN v_has_permission;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro em validate_family_permission: %', SQLERRM;
    RETURN false;
END;
$function$
;

create or replace view "public"."account_balances_with_reserved" as  SELECT a.id AS account_id,
    a.nome,
    a.user_id,
    a.family_id,
    a.tipo,
    a.saldo AS saldo_atual,
    COALESCE(ar.total_reservado, (0)::numeric) AS total_reservado,
    (a.saldo - COALESCE(ar.total_reservado, (0)::numeric)) AS saldo_disponivel,
    a.created_at
   FROM (accounts a
     LEFT JOIN account_reserved ar ON ((a.id = ar.account_id)));


grant delete on table "public"."debug_logs" to "anon";

grant insert on table "public"."debug_logs" to "anon";

grant references on table "public"."debug_logs" to "anon";

grant select on table "public"."debug_logs" to "anon";

grant trigger on table "public"."debug_logs" to "anon";

grant truncate on table "public"."debug_logs" to "anon";

grant update on table "public"."debug_logs" to "anon";

grant delete on table "public"."debug_logs" to "authenticated";

grant insert on table "public"."debug_logs" to "authenticated";

grant references on table "public"."debug_logs" to "authenticated";

grant select on table "public"."debug_logs" to "authenticated";

grant trigger on table "public"."debug_logs" to "authenticated";

grant truncate on table "public"."debug_logs" to "authenticated";

grant update on table "public"."debug_logs" to "authenticated";

grant delete on table "public"."debug_logs" to "service_role";

grant insert on table "public"."debug_logs" to "service_role";

grant references on table "public"."debug_logs" to "service_role";

grant select on table "public"."debug_logs" to "service_role";

grant trigger on table "public"."debug_logs" to "service_role";

grant truncate on table "public"."debug_logs" to "service_role";

grant update on table "public"."debug_logs" to "service_role";

grant delete on table "public"."family_backups" to "anon";

grant insert on table "public"."family_backups" to "anon";

grant references on table "public"."family_backups" to "anon";

grant select on table "public"."family_backups" to "anon";

grant trigger on table "public"."family_backups" to "anon";

grant truncate on table "public"."family_backups" to "anon";

grant update on table "public"."family_backups" to "anon";

grant delete on table "public"."family_backups" to "authenticated";

grant insert on table "public"."family_backups" to "authenticated";

grant references on table "public"."family_backups" to "authenticated";

grant select on table "public"."family_backups" to "authenticated";

grant trigger on table "public"."family_backups" to "authenticated";

grant truncate on table "public"."family_backups" to "authenticated";

grant update on table "public"."family_backups" to "authenticated";

grant delete on table "public"."family_backups" to "service_role";

grant insert on table "public"."family_backups" to "service_role";

grant references on table "public"."family_backups" to "service_role";

grant select on table "public"."family_backups" to "service_role";

grant trigger on table "public"."family_backups" to "service_role";

grant truncate on table "public"."family_backups" to "service_role";

grant update on table "public"."family_backups" to "service_role";

grant delete on table "public"."family_invites" to "anon";

grant insert on table "public"."family_invites" to "anon";

grant references on table "public"."family_invites" to "anon";

grant select on table "public"."family_invites" to "anon";

grant trigger on table "public"."family_invites" to "anon";

grant truncate on table "public"."family_invites" to "anon";

grant update on table "public"."family_invites" to "anon";

grant delete on table "public"."family_invites" to "authenticated";

grant insert on table "public"."family_invites" to "authenticated";

grant references on table "public"."family_invites" to "authenticated";

grant select on table "public"."family_invites" to "authenticated";

grant trigger on table "public"."family_invites" to "authenticated";

grant truncate on table "public"."family_invites" to "authenticated";

grant update on table "public"."family_invites" to "authenticated";

grant delete on table "public"."family_invites" to "service_role";

grant insert on table "public"."family_invites" to "service_role";

grant references on table "public"."family_invites" to "service_role";

grant select on table "public"."family_invites" to "service_role";

grant trigger on table "public"."family_invites" to "service_role";

grant truncate on table "public"."family_invites" to "service_role";

grant update on table "public"."family_invites" to "service_role";

grant delete on table "public"."fixed_expenses" to "anon";

grant insert on table "public"."fixed_expenses" to "anon";

grant references on table "public"."fixed_expenses" to "anon";

grant select on table "public"."fixed_expenses" to "anon";

grant trigger on table "public"."fixed_expenses" to "anon";

grant truncate on table "public"."fixed_expenses" to "anon";

grant update on table "public"."fixed_expenses" to "anon";

grant delete on table "public"."fixed_expenses" to "authenticated";

grant insert on table "public"."fixed_expenses" to "authenticated";

grant references on table "public"."fixed_expenses" to "authenticated";

grant select on table "public"."fixed_expenses" to "authenticated";

grant trigger on table "public"."fixed_expenses" to "authenticated";

grant truncate on table "public"."fixed_expenses" to "authenticated";

grant update on table "public"."fixed_expenses" to "authenticated";

grant delete on table "public"."fixed_expenses" to "service_role";

grant insert on table "public"."fixed_expenses" to "service_role";

grant references on table "public"."fixed_expenses" to "service_role";

grant select on table "public"."fixed_expenses" to "service_role";

grant trigger on table "public"."fixed_expenses" to "service_role";

grant truncate on table "public"."fixed_expenses" to "service_role";

grant update on table "public"."fixed_expenses" to "service_role";

grant delete on table "public"."report_templates" to "anon";

grant insert on table "public"."report_templates" to "anon";

grant references on table "public"."report_templates" to "anon";

grant select on table "public"."report_templates" to "anon";

grant trigger on table "public"."report_templates" to "anon";

grant truncate on table "public"."report_templates" to "anon";

grant update on table "public"."report_templates" to "anon";

grant delete on table "public"."report_templates" to "authenticated";

grant insert on table "public"."report_templates" to "authenticated";

grant references on table "public"."report_templates" to "authenticated";

grant select on table "public"."report_templates" to "authenticated";

grant trigger on table "public"."report_templates" to "authenticated";

grant truncate on table "public"."report_templates" to "authenticated";

grant update on table "public"."report_templates" to "authenticated";

grant delete on table "public"."report_templates" to "service_role";

grant insert on table "public"."report_templates" to "service_role";

grant references on table "public"."report_templates" to "service_role";

grant select on table "public"."report_templates" to "service_role";

grant trigger on table "public"."report_templates" to "service_role";

grant truncate on table "public"."report_templates" to "service_role";

grant update on table "public"."report_templates" to "service_role";

grant delete on table "public"."scheduled_exports" to "anon";

grant insert on table "public"."scheduled_exports" to "anon";

grant references on table "public"."scheduled_exports" to "anon";

grant select on table "public"."scheduled_exports" to "anon";

grant trigger on table "public"."scheduled_exports" to "anon";

grant truncate on table "public"."scheduled_exports" to "anon";

grant update on table "public"."scheduled_exports" to "anon";

grant delete on table "public"."scheduled_exports" to "authenticated";

grant insert on table "public"."scheduled_exports" to "authenticated";

grant references on table "public"."scheduled_exports" to "authenticated";

grant select on table "public"."scheduled_exports" to "authenticated";

grant trigger on table "public"."scheduled_exports" to "authenticated";

grant truncate on table "public"."scheduled_exports" to "authenticated";

grant update on table "public"."scheduled_exports" to "authenticated";

grant delete on table "public"."scheduled_exports" to "service_role";

grant insert on table "public"."scheduled_exports" to "service_role";

grant references on table "public"."scheduled_exports" to "service_role";

grant select on table "public"."scheduled_exports" to "service_role";

grant trigger on table "public"."scheduled_exports" to "service_role";

grant truncate on table "public"."scheduled_exports" to "service_role";

grant update on table "public"."scheduled_exports" to "service_role";

create policy "accounts_delete_family"
on "public"."accounts"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE (fm.user_id = auth.uid())))));


create policy "accounts_delete_own"
on "public"."accounts"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "accounts_insert_family"
on "public"."accounts"
as permissive
for insert
to authenticated
with check (((user_id = auth.uid()) OR (family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE (fm.user_id = auth.uid())))));


create policy "accounts_insert_own"
on "public"."accounts"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "accounts_select_family"
on "public"."accounts"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE (fm.user_id = auth.uid())))));


create policy "accounts_select_own"
on "public"."accounts"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "accounts_update_family"
on "public"."accounts"
as permissive
for update
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE (fm.user_id = auth.uid())))));


create policy "accounts_update_own"
on "public"."accounts"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "audit_logs_delete_simple"
on "public"."audit_logs"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "audit_logs_insert_simple"
on "public"."audit_logs"
as permissive
for insert
to public
with check ((auth.uid() IS NOT NULL));


create policy "audit_logs_select_admins"
on "public"."audit_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "audit_logs_update_simple"
on "public"."audit_logs"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "budgets_delete_own"
on "public"."budgets"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "budgets_insert_own"
on "public"."budgets"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "budgets_select_own"
on "public"."budgets"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "budgets_update_own"
on "public"."budgets"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "categories_delete_user"
on "public"."categories"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "categories_insert_user"
on "public"."categories"
as permissive
for insert
to public
with check (((auth.uid() = user_id) OR ((user_id IS NULL) AND (family_id IS NULL))));


create policy "categories_select_public"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "categories_update_user"
on "public"."categories"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "debug_logs_deny_all"
on "public"."debug_logs"
as restrictive
for all
to public
using (false);


create policy "debug_logs_dev_access"
on "public"."debug_logs"
as permissive
for all
to authenticated
using ((current_setting('app.environment'::text, true) = 'development'::text));


create policy "families_select_authenticated"
on "public"."families"
as permissive
for select
to public
using (((auth.uid() IS NOT NULL) AND (id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE (family_members.user_id = auth.uid())))));


create policy "family_backups_delete_policy"
on "public"."family_backups"
as permissive
for delete
to authenticated
using ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_backups_insert_policy"
on "public"."family_backups"
as permissive
for insert
to authenticated
with check ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_backups_select_policy"
on "public"."family_backups"
as permissive
for select
to authenticated
using ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE (fm.user_id = auth.uid()))));


create policy "family_backups_update_policy"
on "public"."family_backups"
as permissive
for update
to authenticated
using ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_invites_select_authenticated"
on "public"."family_invites"
as permissive
for select
to public
using (((auth.uid() IS NOT NULL) AND (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE (family_members.user_id = auth.uid())))));


create policy "family_members_select_authenticated"
on "public"."family_members"
as permissive
for select
to public
using (((auth.uid() IS NOT NULL) AND (family_id IN ( SELECT family_members_1.family_id
   FROM family_members family_members_1
  WHERE (family_members_1.user_id = auth.uid())))));


create policy "fixed_expenses_delete_own"
on "public"."fixed_expenses"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "fixed_expenses_insert_own"
on "public"."fixed_expenses"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "fixed_expenses_select_own"
on "public"."fixed_expenses"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "fixed_expenses_update_own"
on "public"."fixed_expenses"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "goal_allocations_delete_own"
on "public"."goal_allocations"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "goal_allocations_insert_own"
on "public"."goal_allocations"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "goal_allocations_select_own"
on "public"."goal_allocations"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "goal_allocations_update_own"
on "public"."goal_allocations"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "goals_delete_simple"
on "public"."goals"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "goals_insert_family"
on "public"."goals"
as permissive
for insert
to authenticated
with check (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN ( SELECT get_user_families(auth.uid()) AS get_user_families)))));


create policy "goals_insert_simple"
on "public"."goals"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "goals_select_simple"
on "public"."goals"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "goals_update_simple"
on "public"."goals"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "notifications_delete"
on "public"."notifications"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


create policy "notifications_delete_policy"
on "public"."notifications"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "notifications_insert"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


create policy "notifications_insert_policy"
on "public"."notifications"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "notifications_select"
on "public"."notifications"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE (family_members.user_id = auth.uid())))));


create policy "notifications_select_policy"
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "notifications_update"
on "public"."notifications"
as permissive
for update
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


create policy "notifications_update_policy"
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "profiles_delete_own"
on "public"."profiles"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "profiles_insert_own"
on "public"."profiles"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "profiles_select_own"
on "public"."profiles"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "profiles_update_own"
on "public"."profiles"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can delete their own report templates"
on "public"."report_templates"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own report templates"
on "public"."report_templates"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own report templates"
on "public"."report_templates"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own report templates"
on "public"."report_templates"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own scheduled exports"
on "public"."scheduled_exports"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own scheduled exports"
on "public"."scheduled_exports"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own scheduled exports"
on "public"."scheduled_exports"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own scheduled exports"
on "public"."scheduled_exports"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "transactions_delete_simple"
on "public"."transactions"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "transactions_insert_simple"
on "public"."transactions"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "transactions_select_simple"
on "public"."transactions"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "transactions_update_simple"
on "public"."transactions"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER set_user_id_accounts BEFORE INSERT ON public.accounts FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER set_user_id_budgets BEFORE INSERT ON public.budgets FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER trigger_budget_exceeded AFTER INSERT OR UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION handle_budget_exceeded();

CREATE TRIGGER set_user_id_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER trigger_new_invite AFTER INSERT ON public.family_invites FOR EACH ROW EXECUTE FUNCTION handle_new_invite();

CREATE TRIGGER trigger_member_removal AFTER DELETE ON public.family_members FOR EACH ROW EXECUTE FUNCTION handle_member_removal();

CREATE TRIGGER trigger_member_role_change AFTER UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION handle_member_role_change();

CREATE TRIGGER trigger_new_family_member AFTER INSERT ON public.family_members FOR EACH ROW EXECUTE FUNCTION handle_new_family_member();

CREATE TRIGGER set_user_id_fixed_expenses BEFORE INSERT ON public.fixed_expenses FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER set_user_id_goal_allocations BEFORE INSERT ON public.goal_allocations FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER update_goal_allocations_updated_at_trigger BEFORE UPDATE ON public.goal_allocations FOR EACH ROW EXECUTE FUNCTION update_goal_allocations_updated_at();

CREATE TRIGGER set_user_id_goals BEFORE INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_id_notifications BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_id_report_templates BEFORE INSERT ON public.report_templates FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_id_scheduled_exports BEFORE INSERT ON public.scheduled_exports FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER update_scheduled_exports_updated_at BEFORE UPDATE ON public.scheduled_exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ensure_transaction_family_id_trigger BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION ensure_transaction_family_id();

CREATE TRIGGER set_user_id_transactions BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER trigger_check_credit_card_balance AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION check_credit_card_balance();

CREATE TRIGGER trigger_large_transaction AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION handle_large_transaction();


