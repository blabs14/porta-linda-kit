-- Local backend hotfix: funções essenciais e políticas mínimas
-- ATENÇÃO: apenas para ambiente local

-- Policies básicas (user_id = auth.uid())
-- Accounts
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_select_own') THEN
    EXECUTE 'create policy accounts_select_own on public.accounts for select using (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_insert_own') THEN
    EXECUTE 'create policy accounts_insert_own on public.accounts for insert with check (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_update_own') THEN
    EXECUTE 'create policy accounts_update_own on public.accounts for update using (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='accounts_delete_own') THEN
    EXECUTE 'create policy accounts_delete_own on public.accounts for delete using (user_id = auth.uid())';
  END IF;
END
$do$;

-- Categories
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_select_own') THEN
    EXECUTE 'create policy categories_select_own on public.categories for select using (coalesce(user_id, auth.uid()) = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_insert_own') THEN
    EXECUTE 'create policy categories_insert_own on public.categories for insert with check (coalesce(user_id, auth.uid()) = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_update_own') THEN
    EXECUTE 'create policy categories_update_own on public.categories for update using (coalesce(user_id, auth.uid()) = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_delete_own') THEN
    EXECUTE 'create policy categories_delete_own on public.categories for delete using (coalesce(user_id, auth.uid()) = auth.uid())';
  END IF;
END
$do$;

-- Transactions
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='transactions_select_own') THEN
    EXECUTE 'create policy transactions_select_own on public.transactions for select using (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='transactions_insert_own') THEN
    EXECUTE 'create policy transactions_insert_own on public.transactions for insert with check (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='transactions_update_own') THEN
    EXECUTE 'create policy transactions_update_own on public.transactions for update using (user_id = auth.uid())';
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='transactions_delete_own') THEN
    EXECUTE 'create policy transactions_delete_own on public.transactions for delete using (user_id = auth.uid())';
  END IF;
END
$do$;

-- Função: recalcula e atualiza o saldo agregado da conta
drop function if exists public.update_account_balance(uuid);
create or replace function public.update_account_balance(account_id_param uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  total numeric(15,2);
begin
  select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2)
    into total
  from public.transactions t
  where t.account_id = account_id_param;

  update public.accounts
     set saldo = coalesce(total, 0)
   where id = account_id_param;
  return true;
end;
$$;

revoke all on function public.update_account_balance(uuid) from public;
grant execute on function public.update_account_balance(uuid) to authenticated;

-- Função: obtém contas do utilizador com saldos calculados
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_user_accounts_with_balances' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'create or replace function public.get_user_accounts_with_balances(p_user_id uuid)
    returns table (
      account_id uuid,
      nome text,
      tipo text,
      saldo_atual numeric(15,2),
      total_reservado numeric(15,2),
      saldo_disponivel numeric(15,2)
    )
    language sql
    security definer
    as $$
      select 
        a.id as account_id,
        a.nome,
        a.tipo,
        coalesce(sum(case when t.tipo = ''receita'' then t.valor else -t.valor end), 0)::numeric(15,2) as saldo_atual,
        0::numeric(15,2) as total_reservado,
        (coalesce(sum(case when t.tipo = ''receita'' then t.valor else -t.valor end), 0))::numeric(15,2) as saldo_disponivel
      from public.accounts a
      left join public.transactions t on t.account_id = a.id
      where a.user_id = p_user_id
      group by a.id, a.nome, a.tipo
      order by a.nome;
    $$';
  END IF;
END
$do$;

revoke all on function public.get_user_accounts_with_balances(uuid) from public;
grant execute on function public.get_user_accounts_with_balances(uuid) to authenticated;

-- Função: define saldo alvo criando 1 transação de ajuste (diferença)
drop function if exists public.set_regular_account_balance(uuid, uuid, numeric);
create or replace function public.set_regular_account_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_new_balance numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_current numeric(15,2);
  v_diff numeric(15,2);
  v_cat_id uuid;
  v_tx_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Permission denied';
  end if;

  select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2)
    into v_current
  from public.transactions t
  where t.account_id = p_account_id;

  v_diff := coalesce(p_new_balance, 0)::numeric(15,2) - coalesce(v_current, 0)::numeric(15,2);

  if abs(coalesce(v_diff,0)) < 0.005 then
    return null;
  else
    -- garantir categoria "Ajuste" do utilizador
    select c.id into v_cat_id
      from public.categories c
     where c.user_id = p_user_id and c.nome = 'Ajuste'
     limit 1;

    if v_cat_id is null then
      insert into public.categories (id, nome, user_id, cor)
      values (gen_random_uuid(), 'Ajuste', p_user_id, '#6B7280')
      returning id into v_cat_id;
    end if;

    insert into public.transactions (
      id, user_id, account_id, categoria_id, valor, tipo, data, descricao
    ) values (
      gen_random_uuid(), p_user_id, p_account_id, v_cat_id,
      abs(v_diff), case when v_diff > 0 then 'receita' else 'despesa' end,
      current_date, concat('Ajuste de saldo: ', case when v_diff > 0 then '+' else '' end, v_diff::text, '€')
    ) returning id into v_tx_id;

    perform public.update_account_balance(p_account_id);
    return v_tx_id;
  end if;
end;
$$;

revoke all on function public.set_regular_account_balance(uuid, uuid, numeric) from public;
grant execute on function public.set_regular_account_balance(uuid, uuid, numeric) to authenticated;

-- Transferência entre contas (não afeta KPIs de receitas/despesas globais fora do contexto das contas)
drop function if exists public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date);
create or replace function public.create_transfer_transaction(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_user_id uuid,
  p_categoria_id uuid,
  p_description text,
  p_data date
)
returns jsonb
language plpgsql
security definer
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Permission denied';
  end if;

  if coalesce(p_amount,0) <= 0 then
    return jsonb_build_object('error', 'Invalid amount');
  end if;

  -- despesa na conta de origem
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, tipo, data, descricao)
  values (gen_random_uuid(), p_user_id, p_from_account_id, p_categoria_id, p_amount, 'despesa', coalesce(p_data, current_date), coalesce(p_description, 'Transferência'));

  -- receita na conta de destino
  insert into public.transactions (id, user_id, account_id, categoria_id, valor, tipo, data, descricao)
  values (gen_random_uuid(), p_user_id, p_to_account_id, p_categoria_id, p_amount, 'receita', coalesce(p_data, current_date), coalesce(p_description, 'Transferência'));

  perform public.update_account_balance(p_from_account_id);
  perform public.update_account_balance(p_to_account_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date) from public;
grant execute on function public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date) to authenticated;

-- Wrapper: pagamento de cartão a partir de conta bancária
create or replace function public.pay_credit_card_from_account(
  p_user_id uuid,
  p_card_account_id uuid,
  p_bank_account_id uuid,
  p_amount numeric,
  p_date date,
  p_descricao text
)
returns boolean
language plpgsql
security definer
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Permission denied';
  end if;

  -- Reutilizar a lógica de transferência
  perform public.create_transfer_transaction(p_bank_account_id, p_card_account_id, p_amount, p_user_id, (
    select id from public.categories where user_id = p_user_id order by created_at limit 1
  ), coalesce(p_descricao, 'Pagamento de cartão'), p_date);
  return true;
end;
$$;

revoke all on function public.pay_credit_card_from_account(uuid, uuid, uuid, numeric, date, text) from public;
grant execute on function public.pay_credit_card_from_account(uuid, uuid, uuid, numeric, date, text) to authenticated;

-- Sumário simples de cartão de crédito
create or replace function public.get_credit_card_summary(p_account_id uuid)
returns table (
  saldo numeric(15,2),
  total_gastos numeric(15,2),
  total_pagamentos numeric(15,2),
  status text,
  ciclo_inicio text
)
language sql
security definer
as $$
  with tx as (
    select 
      sum(case when t.tipo = 'despesa' then t.valor else 0 end)::numeric(15,2) as gastos,
      sum(case when t.tipo = 'receita' then t.valor else 0 end)::numeric(15,2) as pagamentos
    from public.transactions t
    where t.account_id = p_account_id
  )
  select 
    coalesce(tx.pagamentos,0) - coalesce(tx.gastos,0) as saldo,
    coalesce(tx.gastos,0) as total_gastos,
    coalesce(tx.pagamentos,0) as total_pagamentos,
    'ativo'::text as status,
    to_char(date_trunc('month', now()), 'YYYY-MM-DD') as ciclo_inicio
  from tx;
$$;

revoke all on function public.get_credit_card_summary(uuid) from public;
grant execute on function public.get_credit_card_summary(uuid) to authenticated;

-- Contas familiares com saldos (mínimo viável: contas do utilizador)
create or replace function public.get_family_accounts_with_balances(p_user_id uuid)
returns setof public.get_user_accounts_with_balances return type
language sql
security definer
as $$
  select * from public.get_user_accounts_with_balances(p_user_id);
$$;

revoke all on function public.get_family_accounts_with_balances(uuid) from public;
grant execute on function public.get_family_accounts_with_balances(uuid) to authenticated;

-- Listagem simples de transações pessoais/familiares
create or replace function public.get_personal_transactions()
returns setof public.transactions
language sql
security definer
as $$
  select * from public.transactions where user_id = auth.uid() order by created_at desc;
$$;

create or replace function public.get_family_transactions()
returns setof public.transactions
language sql
security definer
as $$
  select * from public.transactions where user_id = auth.uid() and family_id is not null order by created_at desc;
$$;

revoke all on function public.get_personal_transactions() from public;
revoke all on function public.get_family_transactions() from public;
grant execute on function public.get_personal_transactions() to authenticated;
grant execute on function public.get_family_transactions() to authenticated;

-- Auxiliares (compatibilidade)
create or replace function public.get_user_account_balances()
returns table (
  account_id uuid,
  saldo_atual numeric(15,2)
)
language sql
security definer
as $$
  select a.id as account_id,
         coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)::numeric(15,2) as saldo_atual
    from public.accounts a
    left join public.transactions t on t.account_id = a.id
   where a.user_id = auth.uid()
   group by a.id;
$$;

create or replace function public.get_user_account_reserved()
returns table (
  account_id uuid,
  total_reservado numeric(15,2)
)
language sql
security definer
as $$
  select a.id as account_id, 0::numeric(15,2) as total_reservado
    from public.accounts a
   where a.user_id = auth.uid();
$$;

revoke all on function public.get_user_account_balances() from public;
revoke all on function public.get_user_account_reserved() from public;
grant execute on function public.get_user_account_balances() to authenticated;
grant execute on function public.get_user_account_reserved() to authenticated; 