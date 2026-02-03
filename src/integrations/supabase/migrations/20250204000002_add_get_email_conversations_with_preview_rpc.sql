-- RPC: return email conversations with last message preview (for Live Chat list).
CREATE OR REPLACE FUNCTION public.get_email_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email_connection_id UUID,
  from_email TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction TEXT,
  email_connection_display TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    m.created_at AS last_message_at,
    LEFT(m.body, 200) AS last_message_body,
    m.direction AS last_message_direction,
    COALESCE(NULLIF(TRIM(conn.email_address), ''), conn.inbound_address)::TEXT AS email_connection_display,
    c.created_at,
    c.updated_at
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
  ORDER BY m.created_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_email_conversations_with_preview(UUID) IS 'Email conversations with preview for Live Chat sidebar.';
