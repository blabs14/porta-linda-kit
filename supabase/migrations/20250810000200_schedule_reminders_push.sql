-- Enable pg_net for HTTP calls (idempotent)
create extension if not exists pg_net;
-- Ensure pg_cron is available for scheduling (idempotent)
create extension if not exists pg_cron;

-- Schedule daily invocation of reminders-push-cron at 08:00 Europe/Lisbon (approx via UTC offset)
-- Note: using 07:00 UTC during DST; adjust if needed in winter
select cron.schedule(
  'reminders-push-daily-08lisbon',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://ebitcwrrcumsvqjgrapw.supabase.co/functions/v1/reminders-push-cron',
    timeout_milliseconds := 10000
  ) as request_id;
  $$
); 