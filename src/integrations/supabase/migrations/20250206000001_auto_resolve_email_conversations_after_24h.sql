-- Auto-resolve email conversations after 24 hours from last message (same concept as WhatsApp).
-- Run this function periodically (e.g. every hour via pg_cron or a scheduled Edge Function).

CREATE OR REPLACE FUNCTION public.auto_resolve_email_conversations_after_24h()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  in_progress_id UUID;
  closed_id UUID;
  updated_count INTEGER := 0;
BEGIN
  SELECT id INTO in_progress_id FROM lead_statuses WHERE name = 'In Progress' LIMIT 1;
  SELECT id INTO closed_id FROM lead_statuses WHERE name = 'Closed' LIMIT 1;

  IF in_progress_id IS NULL OR closed_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE email_conversations
    SET lead_status_id = closed_id, updated_at = NOW()
    WHERE lead_status_id = in_progress_id
      AND last_message_at IS NOT NULL
      AND last_message_at < (NOW() - INTERVAL '24 hours')
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO updated_count FROM updated;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.auto_resolve_email_conversations_after_24h() IS
  'Sets email_conversations to Closed (Resolved) when status is In Progress and last_message_at is older than 24 hours. Schedule with pg_cron or call from a scheduled job.';

-- Example: schedule with pg_cron (run every hour) - uncomment if pg_cron is enabled:
-- SELECT cron.schedule('auto-resolve-email-24h', '0 * * * *', 'SELECT auto_resolve_email_conversations_after_24h()');
