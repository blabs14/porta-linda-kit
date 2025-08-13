-- Recurring actions (RPC)
set search_path = public;

create or replace function public._rr_advance_next(p_date date, p_unit text, p_count int)
returns date
language plpgsql
as $$
declare
  base date := p_date;
  target_month date;
  last_day integer;
  desired_day integer;
  res date;
begin
  if p_unit = 'day' then
    return (base + make_interval(days => p_count))::date;
  elsif p_unit = 'week' then
    return (base + make_interval(days => 7 * p_count))::date;
  elsif p_unit = 'month' then
    target_month := (date_trunc('month', base)::date + (make_interval(months => p_count)))::date;
    last_day := extract(day from (date_trunc('month', target_month) + interval '1 month - 1 day'))::int;
    desired_day := greatest(1, least(extract(day from base)::int, last_day));
    res := make_date(extract(year from target_month)::int, extract(month from target_month)::int, desired_day);
    return res;
  elsif p_unit = 'year' then
    target_month := make_date(extract(year from base)::int + p_count, extract(month from base)::int, 1);
    last_day := extract(day from (date_trunc('month', target_month) + interval '1 month - 1 day'))::int;
    desired_day := greatest(1, least(extract(day from base)::int, last_day));
    res := make_date(extract(year from target_month)::int, extract(month from target_month)::int, desired_day);
    return res;
  else
    raise exception 'Invalid interval_unit: %', p_unit;
  end if;
end;
$$;

create or replace function public._rr_can_edit(r recurring_rules)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when r.scope = 'personal' then (r.user_id = auth.uid())
    when r.scope = 'family' then public.is_family_editor(r.family_id, auth.uid())
    else false
  end;
$$;

create or replace function public.rr_pause_rule(rule_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r recurring_rules%rowtype;
begin
  select * into r from public.recurring_rules where id = rule_id for update;
  if not found then raise exception 'Rule not found'; end if;
  if not public._rr_can_edit(r) then raise exception 'Not allowed'; end if;
  if r.status = 'canceled' then raise exception 'Cannot pause a canceled rule'; end if;
  update public.recurring_rules set status = 'paused' where id = rule_id;
end;$$;

create or replace function public.rr_resume_rule(rule_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r recurring_rules%rowtype;
begin
  select * into r from public.recurring_rules where id = rule_id for update;
  if not found then raise exception 'Rule not found'; end if;
  if not public._rr_can_edit(r) then raise exception 'Not allowed'; end if;
  if r.status = 'canceled' then raise exception 'Cannot resume a canceled rule'; end if;
  update public.recurring_rules set status = 'active' where id = rule_id;
end;$$;

create or replace function public.rr_cancel_at_period_end(rule_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r recurring_rules%rowtype;
begin
  select * into r from public.recurring_rules where id = rule_id for update;
  if not found then raise exception 'Rule not found'; end if;
  if not public._rr_can_edit(r) then raise exception 'Not allowed'; end if;
  if r.status = 'canceled' then return; end if;
  update public.recurring_rules set cancel_at_period_end = true where id = rule_id;
end;$$;

create or replace function public.rr_skip_next(rule_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r recurring_rules%rowtype; new_next date;
begin
  select * into r from public.recurring_rules where id = rule_id for update;
  if not found then raise exception 'Rule not found'; end if;
  if not public._rr_can_edit(r) then raise exception 'Not allowed'; end if;
  if r.status <> 'active' then raise exception 'Rule must be active to skip'; end if;
  new_next := public._rr_advance_next(coalesce(r.next_run_date, r.start_date), r.interval_unit, r.interval_count);
  update public.recurring_rules set next_run_date = new_next where id = rule_id;
end;$$; 