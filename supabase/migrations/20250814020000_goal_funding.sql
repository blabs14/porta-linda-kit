-- Goal Funding: regras e contribuições
set local search_path = public;

-- Tabela de regras
create table if not exists public.goal_funding_rules (
	id uuid primary key default gen_random_uuid(),
	goal_id uuid not null references public.goals(id) on delete cascade,
	type text not null check (type in ('income_percent','fixed_monthly','roundup_expense')),
	enabled boolean not null default true,
	percent_bp integer, -- basis points (ex.: 1000 = 10%)
	fixed_cents integer, -- em cêntimos
	day_of_month smallint check (day_of_month between 1 and 28),
	category_id uuid null references public.categories(id),
	min_amount_cents integer,
	currency text not null default 'EUR',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
	new.updated_at = now();
	return new;
end;$$;

create trigger trg_goal_funding_rules_updated_at
before update on public.goal_funding_rules
for each row execute function public.set_updated_at();

create index if not exists idx_goal_funding_rules_goal on public.goal_funding_rules(goal_id);
create index if not exists idx_goal_funding_rules_type_enabled on public.goal_funding_rules(type, enabled);

-- Ledger de contribuições
create table if not exists public.goal_contributions (
	id uuid primary key default gen_random_uuid(),
	goal_id uuid not null references public.goals(id) on delete cascade,
	source_type text not null check (source_type in ('manual','rule')),
	rule_id uuid null references public.goal_funding_rules(id) on delete set null,
	transaction_id uuid null references public.transactions(id) on delete cascade,
	period_key text null, -- YYYY-MM para mensal
	amount_cents integer not null check (amount_cents > 0),
	currency text not null default 'EUR',
	description text null,
	created_at timestamptz not null default now()
);

create index if not exists idx_goal_contrib_goal on public.goal_contributions(goal_id);

-- Idempotência via UNIQUE constraints (NULLs permitidos)
alter table public.goal_contributions
	add constraint uq_goal_contrib_rule_tx unique (rule_id, transaction_id);

alter table public.goal_contributions
	add constraint uq_goal_contrib_rule_period unique (rule_id, goal_id, period_key);

-- RLS
alter table public.goal_funding_rules enable row level security;
alter table public.goal_contributions enable row level security;

-- Políticas: leitura permitida a quem vê o objetivo
drop policy if exists sel_goal_funding_rules on public.goal_funding_rules;
create policy sel_goal_funding_rules on public.goal_funding_rules
	for select using (
		exists(
			select 1 from public.goals g
			where g.id = goal_funding_rules.goal_id
			and (
				g.user_id = auth.uid()
				or (
					g.family_id is not null
					and exists (
						select 1 from public.family_members fm
						where fm.family_id = g.family_id and fm.user_id = auth.uid()
					)
				)
			)
		)
	);

drop policy if exists sel_goal_contributions on public.goal_contributions;
create policy sel_goal_contributions on public.goal_contributions
	for select using (
		exists(
			select 1 from public.goals g
			where g.id = goal_contributions.goal_id
			and (
				g.user_id = auth.uid()
				or (
					g.family_id is not null
					and exists (
						select 1 from public.family_members fm
						where fm.family_id = g.family_id and fm.user_id = auth.uid()
					)
				)
			)
		)
	);

-- Políticas de escrita em regras: owner pessoal; na família roles admin/owner
drop policy if exists ins_upd_del_goal_funding_rules on public.goal_funding_rules;
create policy ins_upd_del_goal_funding_rules on public.goal_funding_rules
	for all to authenticated using (
		exists(
			select 1 from public.goals g
			where g.id = goal_funding_rules.goal_id
			and (
				g.user_id = auth.uid()
				or (
					g.family_id is not null
					and exists (
						select 1 from public.family_members fm
						where fm.family_id = g.family_id and fm.user_id = auth.uid() and fm.role in ('owner','admin')
					)
				)
			)
		)
	) with check (
		exists(
			select 1 from public.goals g
			where g.id = goal_funding_rules.goal_id
			and (
				g.user_id = auth.uid()
				or (
					g.family_id is not null
					and exists (
						select 1 from public.family_members fm
						where fm.family_id = g.family_id and fm.user_id = auth.uid() and fm.role in ('owner','admin')
					)
				)
			)
		)
	);

-- Não permitir escrita direta em goal_contributions (inserido por funções/trigger)
drop policy if exists deny_write_goal_contributions on public.goal_contributions;
create policy deny_write_goal_contributions on public.goal_contributions
	for all to authenticated using (false) with check (false);

-- Função: aplicar contribuições em transações
create or replace function public.handle_goal_funding_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_is_income boolean;
	v_is_expense boolean;
	v_amount_cents integer;
	v_currency text := 'EUR';
	v_rule record;
	v_roundup integer;
	v_contrib integer;
begin
	-- deduzir tipo a partir de NEW.tipo se existir
	v_is_income := (coalesce(NEW.tipo,'') = 'receita');
	v_is_expense := (coalesce(NEW.tipo,'') = 'despesa');
	v_amount_cents := floor(abs(coalesce(NEW.valor,0)) * 100)::int;
	if v_amount_cents <= 0 then
		return NEW;
	end if;

	-- income_percent
	if v_is_income then
		for v_rule in
			select r.* from public.goal_funding_rules r
			join public.goals g on g.id = r.goal_id
			where r.enabled = true and r.type = 'income_percent' and r.currency = v_currency
			and (
				g.user_id = NEW.user_id or (g.family_id is not null and g.family_id = NEW.family_id)
			)
			and (r.category_id is null or r.category_id = NEW.categoria_id)
			and (r.min_amount_cents is null or v_amount_cents >= r.min_amount_cents)
		loop
			if coalesce(v_rule.percent_bp,0) > 0 then
				v_contrib := floor((v_amount_cents * v_rule.percent_bp) / 10000.0);
				if v_contrib > 0 then
					insert into public.goal_contributions(goal_id, source_type, rule_id, transaction_id, amount_cents, currency, description)
					values (v_rule.goal_id, 'rule', v_rule.id, NEW.id, v_contrib, v_currency, 'income_percent')
					on conflict on constraint uq_goal_contrib_rule_tx do nothing;
				end if;
			end if;
		end loop;
	end if;

	-- roundup_expense
	if v_is_expense then
		v_roundup := (100 - (v_amount_cents % 100)) % 100;
		if v_roundup > 0 then
			for v_rule in
				select r.* from public.goal_funding_rules r
				join public.goals g on g.id = r.goal_id
				where r.enabled = true and r.type = 'roundup_expense' and r.currency = v_currency
				and (
					g.user_id = NEW.user_id or (g.family_id is not null and g.family_id = NEW.family_id)
				)
				and (r.category_id is null or r.category_id = NEW.categoria_id)
				and (r.min_amount_cents is null or v_amount_cents >= r.min_amount_cents)
			loop
				insert into public.goal_contributions(goal_id, source_type, rule_id, transaction_id, amount_cents, currency, description)
				values (v_rule.goal_id, 'rule', v_rule.id, NEW.id, v_roundup, v_currency, 'roundup_expense')
				on conflict on constraint uq_goal_contrib_rule_tx do nothing;
			end loop;
		end if;
	end if;

	return NEW;
end;$$;

-- Trigger após inserir transação
create trigger trg_goal_funding_on_transaction
after insert on public.transactions
for each row execute function public.handle_goal_funding_on_transaction();

-- Função mensal fixa
create or replace function public.apply_fixed_monthly_contributions(p_date date default now())
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_period text := to_char(p_date, 'YYYY-MM');
	v_day int := extract(day from p_date);
	v_rule record;
	v_count int := 0;
	v_affected int := 0;
begin
	for v_rule in
		select r.* from public.goal_funding_rules r
		where r.enabled = true and r.type = 'fixed_monthly' and coalesce(r.day_of_month,1) <= v_day
	loop
		if coalesce(v_rule.fixed_cents,0) > 0 then
			insert into public.goal_contributions(goal_id, source_type, rule_id, period_key, amount_cents, currency, description)
			values (v_rule.goal_id, 'rule', v_rule.id, v_period, v_rule.fixed_cents, v_rule.currency, 'fixed_monthly')
			on conflict on constraint uq_goal_contrib_rule_period do nothing;
			get diagnostics v_affected = ROW_COUNT;
			v_count := v_count + v_affected;
		end if;
	end loop;
	return v_count;
end;$$; 