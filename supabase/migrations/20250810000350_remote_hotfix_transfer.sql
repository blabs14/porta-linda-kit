-- Remote hotfix: ensure create_transfer_transaction has expected signature/return type
DO $$
BEGIN
  -- Try to drop various known signatures to avoid 42P13 conflicts
  BEGIN
    EXECUTE 'drop function if exists public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text, date)';
  EXCEPTION WHEN others THEN
    -- ignore
  END;
  BEGIN
    EXECUTE 'drop function if exists public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid, text)';
  EXCEPTION WHEN others THEN
  END;
  BEGIN
    EXECUTE 'drop function if exists public.create_transfer_transaction(uuid, uuid, numeric, uuid, uuid)';
  EXCEPTION WHEN others THEN
  END;
END$$;

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