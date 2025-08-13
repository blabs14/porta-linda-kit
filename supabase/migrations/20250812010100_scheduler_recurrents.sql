-- Scheduler diário para recurrents_run
-- Requer extensões pg_net e pg_cron ativas no projeto
-- Cria tarefa que chama a edge function diariamente às 03:00 UTC

-- Criar função wrapper que aciona a Edge Function via http
create or replace function public.run_recurrents_now()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := current_setting('app.settings.edge_base_url', true),
    headers := jsonb_build_object('Authorization', 'Bearer '|| current_setting('app.settings.service_role_key', true)),
    body := '{"preview":false}'::jsonb
  );
end;$$;

-- Job diário (03:00 UTC)
select cron.schedule('recurrents_daily', '0 3 * * *', $$select public.run_recurrents_now();$$); 