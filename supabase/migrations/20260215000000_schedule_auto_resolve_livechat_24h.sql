-- Schedule auto-resolve livechat: run auto_resolve_conversations_after_24h() every hour.
-- Without this schedule, the function is never called and tickets stay open past 24h.
-- Requires pg_cron extension (already enabled on Supabase).

DO $$
BEGIN
  PERFORM cron.unschedule('auto-resolve-livechat-24h');
EXCEPTION
  WHEN OTHERS THEN NULL; -- job may not exist yet
END
$$;

SELECT cron.schedule(
  'auto-resolve-livechat-24h',
  '0 * * * *',  -- every hour at minute 0
  'SELECT auto_resolve_conversations_after_24h()'
);
