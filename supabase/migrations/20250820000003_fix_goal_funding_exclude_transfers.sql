-- Fix goal funding to exclude transfers from percentage calculations
-- This migration updates the goal funding trigger to ignore 'transferencia' type transactions
-- for income_percent and roundup_expense rules

set local search_path = public;

-- Update the goal funding trigger function to exclude transfers
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
	-- Skip transfers completely for goal funding
	if coalesce(NEW.tipo,'') = 'transferencia' then
		return NEW;
	end if;

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

-- Grant necessary permissions
grant execute on function public.handle_goal_funding_on_transaction() to authenticated;

-- Add comment explaining the change
comment on function public.handle_goal_funding_on_transaction() is 
'Goal funding trigger function that excludes transfers (transferencia) from automatic percentage and roundup calculations';