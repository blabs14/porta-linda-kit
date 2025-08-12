set check_function_bodies = off;

-- Garantir helpers
create or replace function public.is_member_of_family(
  p_family_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id
  );
$$;

-- get_family_kpis: membership via helper
create or replace function public.get_family_kpis(
  p_family_id uuid,
  p_date_start date,
  p_date_end date,
  p_exclude_transfers boolean default true
)
returns table (
  total_balance numeric,
  credit_card_debt numeric,
  monthly_savings numeric,
  goals_account_balance numeric,
  total_goals_value numeric,
  goals_progress_percentage numeric,
  top_goal_progress numeric,
  total_budget_spent numeric,
  total_budget_amount numeric,
  budget_spent_percentage numeric,
  prev_month_savings numeric,
  delta_vs_prev numeric,
  overspent_budgets_count integer,
  overspent_budget_ids uuid[],
  total_members integer,
  pending_invites integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  month_str text := to_char(p_date_start, 'YYYY-MM');
  v_prev_start date := (date_trunc('month', p_date_start - interval '1 month'))::date;
  v_prev_end date := (date_trunc('month', p_date_start))::date - 1;
  v_spent numeric := 0;
  v_amount numeric := 0;
  v_overs_ids uuid[] := '{}';
  v_pending_invites integer := 0;
  v_total_members integer := 0;
  v_goals_total numeric := 0;
  v_goals_current numeric := 0;
  v_top_goal numeric := 0;
  v_cc_debt numeric := 0;
  v_total_balance numeric := 0;
  v_savings numeric := 0;
  v_prev_savings numeric := 0;
  v_budget_pct numeric := 0;
begin
  if not public.is_member_of_family(p_family_id, auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(sum(a.saldo),0),
         coalesce(sum(case when a.tipo = 'cartão de crédito' then a.saldo else 0 end),0)
  into v_total_balance, v_cc_debt
  from public.accounts a
  where a.family_id = p_family_id;

  select coalesce(sum(g.valor_objetivo),0), coalesce(sum(g.valor_atual),0),
         coalesce(max(case when g.valor_objetivo > 0 then (g.valor_atual/g.valor_objetivo)*100 else 0 end),0)
  into v_goals_total, v_goals_current, v_top_goal
  from public.goals g
  where g.family_id = p_family_id;

  select coalesce(sum(case when t.tipo = 'receita' then t.valor else 0 end),0)
       - coalesce(sum(case when t.tipo = 'despesa' then t.valor else 0 end),0)
  into v_savings
  from public.transactions t
  where t.family_id = p_family_id
    and t.data between p_date_start and p_date_end
    and (not p_exclude_transfers or t.tipo <> 'transferencia');

  select coalesce(sum(case when t.tipo = 'receita' then t.valor else 0 end),0)
       - coalesce(sum(case when t.tipo = 'despesa' then t.valor else 0 end),0)
  into v_prev_savings
  from public.transactions t
  where t.family_id = p_family_id
    and t.data between v_prev_start and v_prev_end
    and (not p_exclude_transfers or t.tipo <> 'transferencia');

  with budget_rows as (
    select b.id, b.categoria_id, b.valor
    from public.budgets b
    where b.family_id = p_family_id and b.mes = month_str
  ),
  spent as (
    select t.categoria_id, coalesce(sum(t.valor),0) as total
    from public.transactions t
    where t.family_id = p_family_id
      and t.tipo = 'despesa'
      and to_char(t.data,'YYYY-MM') = month_str
    group by t.categoria_id
  ),
  joined as (
    select br.id, br.categoria_id, br.valor as budget_value, coalesce(s.total,0) as spent
    from budget_rows br
    left join spent s on s.categoria_id = br.categoria_id
  )
  select coalesce(sum(j.spent),0), coalesce(sum(j.budget_value),0),
         coalesce(array_agg(j.id) filter (where j.spent > j.budget_value), '{}')
  into v_spent, v_amount, v_overs_ids
  from joined j;

  if v_amount > 0 then
    v_budget_pct := (v_spent / v_amount) * 100.0;
  else
    v_budget_pct := 0;
  end if;

  select count(*) into v_total_members from public.family_members fm where fm.family_id = p_family_id;

  if exists (
    select 1 from pg_catalog.pg_tables where schemaname = 'public' and tablename = 'family_invites'
  ) then
    execute 'select count(*) from public.family_invites where family_id = $1 and status = ''pending''' into v_pending_invites using p_family_id;
  else
    v_pending_invites := 0;
  end if;

  return query select
    v_total_balance as total_balance,
    v_cc_debt as credit_card_debt,
    v_savings as monthly_savings,
    v_goals_current as goals_account_balance,
    v_goals_total as total_goals_value,
    case when v_goals_total > 0 then (v_goals_current / v_goals_total) * 100.0 else 0 end as goals_progress_percentage,
    v_top_goal as top_goal_progress,
    v_spent as total_budget_spent,
    v_amount as total_budget_amount,
    v_budget_pct as budget_spent_percentage,
    v_prev_savings as prev_month_savings,
    (v_savings - v_prev_savings) as delta_vs_prev,
    coalesce(array_length(v_overs_ids,1),0) as overspent_budgets_count,
    v_overs_ids as overspent_budget_ids,
    v_total_members as total_members,
    v_pending_invites as pending_invites;
end
$$;

-- get_family_category_breakdown: membership via helper
create or replace function public.get_family_category_breakdown(
  p_family_id uuid,
  p_date_start date,
  p_date_end date,
  p_kind text default 'despesa'
)
returns table (
  category_id uuid,
  category_name text,
  total numeric,
  percentage numeric
)
language sql
security invoker
set search_path = public
as $$
  with _check as (
    select public.is_member_of_family(p_family_id, auth.uid()) as ok
  ),
  base as (
    select t.categoria_id, coalesce(sum(t.valor),0) as total
    from public.transactions t
    where t.family_id = p_family_id
      and t.data between p_date_start and p_date_end
      and (
        case when lower(p_kind) = 'despesa' then t.tipo = 'despesa'
             when lower(p_kind) = 'receita' then t.tipo = 'receita'
             else t.tipo in ('despesa','receita') end
      )
      and t.tipo <> 'transferencia'
    group by t.categoria_id
  ),
  total_all as (
    select coalesce(sum(total),0) as grand_total from base
  )
  select c.id as category_id,
         coalesce(c.nome,'Sem categoria') as category_name,
         b.total,
         case when ta.grand_total > 0 then (b.total/ta.grand_total)*100.0 else 0 end as percentage
  from base b
  left join public.categories c on c.id = b.categoria_id
  cross join total_all ta
  where (select ok from _check);
$$; 