-- Create reminders table for push notifications
create extension if not exists pgcrypto;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  family_id uuid,
  title text not null,
  description text,
  -- both kept for compatibility with existing code paths
  date date not null,
  data text,
  recurring boolean default false,
  created_at timestamptz not null default now()
);

-- FKs (best-effort, ignore errors if auth schema not available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_user_id_fkey'
  ) THEN
    ALTER TABLE public.reminders
    ADD CONSTRAINT reminders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Indexes
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_date_idx on public.reminders(date);

-- Enable RLS
alter table public.reminders enable row level security;

-- Idempotent policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'reminders_select_own'
  ) THEN
    EXECUTE 'create policy reminders_select_own on public.reminders for select using (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'reminders_insert_own'
  ) THEN
    EXECUTE 'create policy reminders_insert_own on public.reminders for insert with check (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'reminders_update_own'
  ) THEN
    EXECUTE 'create policy reminders_update_own on public.reminders for update using (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'reminders_delete_own'
  ) THEN
    EXECUTE 'create policy reminders_delete_own on public.reminders for delete using (auth.uid() = user_id)';
  END IF;
END$$; 