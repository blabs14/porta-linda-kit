-- Ignorar transferências no cálculo dos saldos agregados
-- Esta migration ajusta a view account_balances e a função update_account_balance
-- para que apenas receitas e despesas afetem o saldo total. As transferências
-- servem para movimentos internos (ex.: alocações para objetivos) e não devem
-- alterar o saldo total da conta.

-- Atualizar view de saldos por conta
create or replace view public.account_balances as
select
  a.id as account_id,
  a.user_id,
  a.family_id,
  a.nome,
  a.tipo,
  coalesce(sum(
    case 
      when t.tipo = 'receita' then t.valor 
      when t.tipo = 'despesa' then -t.valor 
      else 0
    end
  ), 0)::numeric(15,2) as saldo_atual
from public.accounts a
left join public.transactions t 
  on t.account_id = a.id
-- As transferências não contam para saldo total
-- (já coberto na expressão case acima)
group by a.id, a.user_id, a.family_id, a.nome, a.tipo;

-- Atualizar a função de recalcular saldo agregado (compatibilidade)
drop function if exists public.update_account_balance(uuid);
create or replace function public.update_account_balance(account_id_param uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(15,2) := 0;
begin
  select coalesce(sum(
    case 
      when t.tipo = 'receita' then t.valor 
      when t.tipo = 'despesa' then -t.valor 
      else 0
    end
  ), 0)::numeric(15,2)
    into v_balance
  from public.transactions t
  where t.account_id = account_id_param;

  -- Esta função continua a existir por compatibilidade. A app atual lê saldos via views/RPCs.
  -- Caso exista uma coluna materializada, poderia ser atualizada aqui.
  return true;
end;
$$; 