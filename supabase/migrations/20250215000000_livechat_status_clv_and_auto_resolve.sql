-- Livechat status flow: last_inbound_at, lead_id on sales_activities, unified auto-resolve 24h
-- Plan: Quick Action status sync to leads, sales_activities on Converted, auto-Resolve after 24h

-- 1. Add last_inbound_at to whatsapp_conversations and email_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.whatsapp_conversations.last_inbound_at IS 'Timestamp of last inbound message; used for 24h auto-resolve to Closed.';

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.email_conversations.last_inbound_at IS 'Timestamp of last inbound message; used for 24h auto-resolve to Closed.';

-- Backfill whatsapp_conversations.last_inbound_at from whatsapp_messages (max created_at where direction = inbound)
UPDATE public.whatsapp_conversations w
SET last_inbound_at = sub.max_at
FROM (
  SELECT conversation_id, MAX(created_at) AS max_at
  FROM public.whatsapp_messages
  WHERE direction = 'inbound'
  GROUP BY conversation_id
) sub
WHERE w.id = sub.conversation_id
  AND w.last_inbound_at IS NULL;

-- Backfill email_conversations: assume last_message_at is last customer message (inbound)
UPDATE public.email_conversations
SET last_inbound_at = last_message_at
WHERE last_inbound_at IS NULL AND last_message_at IS NOT NULL;

-- 2. Add lead_id to sales_activities for CLV (Customer Lifetime Value)
ALTER TABLE public.sales_activities
  ADD COLUMN IF NOT EXISTS lead_id UUID NULL REFERENCES public.leads(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.sales_activities.lead_id IS 'Links to lead for repeat orders and CLV: SUM(total_amount) per lead_id.';

CREATE INDEX IF NOT EXISTS idx_sales_activities_lead_id
  ON public.sales_activities(lead_id);

-- 3. Unified auto-resolve: set status to Closed when last_inbound_at > 24h for In Progress / Converted / Qualified
-- lead_statuses are per organization_id; update conversations using their org's Closed status
CREATE OR REPLACE FUNCTION public.auto_resolve_conversations_after_24h()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_wa INTEGER := 0;
  updated_email INTEGER := 0;
BEGIN
  -- WhatsApp conversations: set lead_status_id to Closed for same org where status is In Progress/Converted/Qualified and last_inbound_at < 24h
  WITH target AS (
    SELECT w.id, w.organization_id
    FROM whatsapp_conversations w
    JOIN lead_statuses ls ON ls.id = w.lead_status_id AND ls.organization_id = w.organization_id
    WHERE ls.name IN ('In Progress', 'Converted', 'Qualified')
      AND w.last_inbound_at IS NOT NULL
      AND w.last_inbound_at < (NOW() - INTERVAL '24 hours')
  ),
  closed AS (
    SELECT t.id, ls_closed.id AS closed_id
    FROM target t
    JOIN lead_statuses ls_closed ON ls_closed.organization_id = t.organization_id AND ls_closed.name = 'Closed'
  ),
  updated AS (
    UPDATE whatsapp_conversations w
    SET lead_status_id = c.closed_id, updated_at = NOW()
    FROM closed c
    WHERE w.id = c.id
    RETURNING w.id
  )
  SELECT COUNT(*)::INTEGER INTO updated_wa FROM updated;

  -- Email conversations: same logic
  WITH target AS (
    SELECT e.id, e.organization_id
    FROM email_conversations e
    JOIN lead_statuses ls ON ls.id = e.lead_status_id AND ls.organization_id = e.organization_id
    WHERE ls.name IN ('In Progress', 'Converted', 'Qualified')
      AND e.last_inbound_at IS NOT NULL
      AND e.last_inbound_at < (NOW() - INTERVAL '24 hours')
  ),
  closed AS (
    SELECT t.id, ls_closed.id AS closed_id
    FROM target t
    JOIN lead_statuses ls_closed ON ls_closed.organization_id = t.organization_id AND ls_closed.name = 'Closed'
  ),
  updated AS (
    UPDATE email_conversations e
    SET lead_status_id = c.closed_id, updated_at = NOW()
    FROM closed c
    WHERE e.id = c.id
    RETURNING e.id
  )
  SELECT COUNT(*)::INTEGER INTO updated_email FROM updated;

  RETURN updated_wa + updated_email;
END;
$$;

COMMENT ON FUNCTION public.auto_resolve_conversations_after_24h() IS
  'Sets lead_status_id to Closed for whatsapp_conversations and email_conversations when status is In Progress/Converted/Qualified and last_inbound_at is older than 24 hours. Schedule with pg_cron or call from a scheduled job.';
