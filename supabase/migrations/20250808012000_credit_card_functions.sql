-- Credit Card RPCs
-- 1) manage_credit_card_balance: ajusta saldo do cartão criando transações de ajuste
-- 2) get_credit_card_summary: retorna saldo atual, total gastos/pagamentos do ciclo atual
-- 3) pay_credit_card_from_account: pagamento do cartão via transferência de outra conta

-- Safe drops para ambientes locais onde a função já exista com assinatura diferente
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'manage_credit_card_balance';
  IF FOUND THEN
    DROP FUNCTION IF EXISTS public.manage_credit_card_balance(uuid, uuid, numeric);
  END IF;
  PERFORM 1 FROM pg_proc WHERE proname = 'get_credit_card_summary';
  IF FOUND THEN
    DROP FUNCTION IF EXISTS public.get_credit_card_summary(uuid);
  END IF;
  PERFORM 1 FROM pg_proc WHERE proname = 'pay_credit_card_from_account';
  IF FOUND THEN
    DROP FUNCTION IF EXISTS public.pay_credit_card_from_account(uuid, uuid, uuid, numeric, date, text);
  END IF;
END $$;

create or replace function public.manage_credit_card_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_new_balance numeric
) returns boolean
language plpgsql
security definer
as $$
begin
  -- Validar que é cartão de crédito
  if not exists (
    select 1 from public.accounts a where a.id = p_account_id and a.tipo = 'cartão de crédito'
  ) then
    raise exception 'Conta não é um cartão de crédito';
  end if;

  -- Normalizar saldo desejado: nunca positivo
  p_new_balance := case when p_new_balance > 0 then -1 * p_new_balance else p_new_balance end;

  -- Saldo atual
  declare v_current numeric;
  begin
    select coalesce(ab.saldo_atual, 0)
      into v_current
    from public.account_balances ab
    where ab.account_id = p_account_id;

    if v_current is null then
      v_current := 0;
    end if;
  end;

  if p_new_balance = v_current then
    return true;
  end if;

  -- diferença: saldo desejado - atual
  declare v_diff numeric := p_new_balance - v_current;
  declare v_category_id uuid;
  begin
    -- Garantir categoria "Ajuste"
    select c.id into v_category_id
    from public.categories c
    where c.user_id = p_user_id and c.nome = 'Ajuste'
    limit 1;

    if v_category_id is null then
      insert into public.categories (id, user_id, nome, cor)
      values (gen_random_uuid(), p_user_id, 'Ajuste', '#6B7280')
      returning id into v_category_id;
    end if;

    -- Se v_diff < 0, precisamos aumentar a dívida (despesa). Se > 0, reduzir dívida (receita)
    if v_diff < 0 then
      insert into public.transactions (id, account_id, user_id, categoria_id, valor, tipo, data, descricao)
      values (gen_random_uuid(), p_account_id, p_user_id, v_category_id, abs(v_diff), 'despesa', current_date, 'Ajuste saldo cartão');
    else
      insert into public.transactions (id, account_id, user_id, categoria_id, valor, tipo, data, descricao)
      values (gen_random_uuid(), p_account_id, p_user_id, v_category_id, v_diff, 'receita', current_date, 'Ajuste saldo cartão');
    end if;

    return true;
  end;
end;
$$;


create or replace function public.get_credit_card_summary(
  p_account_id uuid
) returns table (
  saldo numeric,
  total_gastos numeric,
  total_pagamentos numeric,
  status text,
  ciclo_inicio date
)
language sql
security definer
as $$
with tx as (
  select 
    t.data,
    t.tipo,
    t.valor,
    sum(case when t.tipo = 'despesa' then t.valor else -t.valor end) over (order by t.data, t.created_at, t.id) as running
  from public.transactions t
  where t.account_id = p_account_id
), last_zero as (
  select max(data) as start_date
  from tx
  where running = 0
), period as (
  select coalesce((select start_date from last_zero), (select min(data) from tx)) as start_date
)
select 
  coalesce((select ab.saldo_atual from public.account_balances ab where ab.account_id = p_account_id), 0) as saldo,
  coalesce((select sum(t.valor) from public.transactions t, period p where t.account_id = p_account_id and t.tipo = 'despesa' and t.data >= p.start_date), 0) as total_gastos,
  coalesce((select sum(t.valor) from public.transactions t, period p where t.account_id = p_account_id and t.tipo = 'receita' and t.data >= p.start_date), 0) as total_pagamentos,
  case when coalesce((select ab.saldo_atual from public.account_balances ab where ab.account_id = p_account_id), 0) < 0 then 'em dívida' else 'pago' end as status,
  (select start_date from period) as ciclo_inicio
$$;


create or replace function public.pay_credit_card_from_account(
  p_user_id uuid,
  p_card_account_id uuid,
  p_bank_account_id uuid,
  p_amount numeric,
  p_date date,
  p_descricao text default null
) returns boolean
language plpgsql
security definer
as $$
declare v_categoria_pagamento uuid; 
begin
  if p_amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  -- Garantir categoria "Pagamento Cartão"
  select c.id into v_categoria_pagamento
  from public.categories c
  where c.user_id = p_user_id and c.nome = 'Pagamento Cartão'
  limit 1;

  if v_categoria_pagamento is null then
    insert into public.categories (id, user_id, nome, cor)
    values (gen_random_uuid(), p_user_id, 'Pagamento Cartão', '#059669')
    returning id into v_categoria_pagamento;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_card_account_id::text));

  begin
    -- Débito na conta bancária (despesa)
    insert into public.transactions (id, account_id, user_id, categoria_id, valor, tipo, data, descricao)
    values (gen_random_uuid(), p_bank_account_id, p_user_id, v_categoria_pagamento, p_amount, 'despesa', p_date, coalesce(p_descricao, 'Pagamento de cartão'));

    -- Crédito no cartão (receita)
    insert into public.transactions (id, account_id, user_id, categoria_id, valor, tipo, data, descricao)
    values (gen_random_uuid(), p_card_account_id, p_user_id, v_categoria_pagamento, p_amount, 'receita', p_date, coalesce(p_descricao, 'Pagamento de cartão'));
  exception when others then
    raise;
  end;

  return true;
end;
$$; 