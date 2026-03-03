-- Include thread_subject in email conversations preview so list can show Subject when body preview is empty (e.g. HTML-only).
DROP FUNCTION IF EXISTS public.get_email_conversations_with_preview(uuid);

CREATE FUNCTION public.get_email_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email_connection_id UUID,
  from_email TEXT,
  from_display_name TEXT,
  thread_subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction TEXT,
  email_connection_display TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  lead_status_id UUID,
  followup INTEGER,
  fu_priority TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.organization_id,
    c.email_connection_id,
    c.from_email,
    c.from_display_name,
    c.thread_subject,
    m.created_at AS last_message_at,
    LEFT(m.body, 200) AS last_message_body,
    m.direction AS last_message_direction,
    COALESCE(NULLIF(TRIM(conn.email_address), ''), conn.inbound_address)::TEXT AS email_connection_display,
    c.created_at,
    c.updated_at,
    c.lead_status_id,
    COALESCE(c.followup, 0),
    c.fu_priority
  FROM email_conversations c
  JOIN organization_email_connections conn ON conn.id = c.email_connection_id AND conn.organization_id = c.organization_id
  LEFT JOIN LATERAL (
    SELECT created_at, body, direction
    FROM email_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.organization_id = p_organization_id
  AND (
    (SELECT ur.role FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.organization_id = p_organization_id LIMIT 1) IN ('owner', 'admin')
    OR (
      (SELECT e.id FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = p_organization_id LIMIT 1) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM leads l
        WHERE l.organization_id = c.organization_id
          AND l.ticket_id = 'EMAIL-' || UPPER(SUBSTRING(REPLACE(c.id::TEXT, '-', ''), 1, 8))
          AND l.assignee_id = (SELECT e.id FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = p_organization_id LIMIT 1)
      )
    )
  )
  ORDER BY m.created_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_email_conversations_with_preview(uuid) IS 'Email conversations with preview and thread_subject. Owner/Admin see all; Employee see only where lead is assigned to them.';
