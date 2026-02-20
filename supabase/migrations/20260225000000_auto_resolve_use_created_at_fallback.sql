-- Auto-resolve: use COALESCE(last_inbound_at, created_at) so conversations with no inbound
-- messages also qualify for 24h rule (effective_at = created_at when last_inbound_at is NULL).
-- Existing logic unchanged: only In Progress/Converted/Qualified or NULL/orphan status; already Closed skipped.

CREATE OR REPLACE FUNCTION public.auto_resolve_conversations_after_24h()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_wa INTEGER := 0;
  updated_email INTEGER := 0;
  updated_ig INTEGER := 0;
BEGIN
  -- WhatsApp: resolve when effective_at > 24h and (active status OR orphan/NULL)
  WITH target AS (
    SELECT w.id, w.organization_id
    FROM whatsapp_conversations w
    LEFT JOIN lead_statuses ls ON ls.id = w.lead_status_id AND ls.organization_id = w.organization_id
    WHERE (COALESCE(w.last_inbound_at, w.created_at)) < (NOW() - INTERVAL '24 hours')
      AND (
        ls.name IN ('In Progress', 'Converted', 'Qualified')
        OR w.lead_status_id IS NULL
        OR ls.id IS NULL
      )
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

  -- Email: same logic
  WITH target AS (
    SELECT e.id, e.organization_id
    FROM email_conversations e
    LEFT JOIN lead_statuses ls ON ls.id = e.lead_status_id AND ls.organization_id = e.organization_id
    WHERE (COALESCE(e.last_inbound_at, e.created_at)) < (NOW() - INTERVAL '24 hours')
      AND (
        ls.name IN ('In Progress', 'Converted', 'Qualified')
        OR e.lead_status_id IS NULL
        OR ls.id IS NULL
      )
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

  -- Instagram: same logic
  WITH target AS (
    SELECT i.id, i.organization_id
    FROM instagram_conversations i
    LEFT JOIN lead_statuses ls ON ls.id = i.lead_status_id AND ls.organization_id = i.organization_id
    WHERE (COALESCE(i.last_inbound_at, i.created_at)) < (NOW() - INTERVAL '24 hours')
      AND (
        ls.name IN ('In Progress', 'Converted', 'Qualified')
        OR i.lead_status_id IS NULL
        OR ls.id IS NULL
      )
  ),
  closed AS (
    SELECT t.id, ls_closed.id AS closed_id
    FROM target t
    JOIN lead_statuses ls_closed ON ls_closed.organization_id = t.organization_id AND ls_closed.name = 'Closed'
  ),
  updated AS (
    UPDATE instagram_conversations i
    SET lead_status_id = c.closed_id, updated_at = NOW()
    FROM closed c
    WHERE i.id = c.id
    RETURNING i.id
  )
  SELECT COUNT(*)::INTEGER INTO updated_ig FROM updated;

  RETURN updated_wa + updated_email + updated_ig;
END;
$$;

COMMENT ON FUNCTION public.auto_resolve_conversations_after_24h() IS
  'Sets lead_status_id to Closed for whatsapp_conversations, email_conversations, and instagram_conversations when effective_at = COALESCE(last_inbound_at, created_at) is older than 24 hours and status is In Progress/Converted/Qualified or lead_status_id is NULL/orphan. Schedule with pg_cron.';
