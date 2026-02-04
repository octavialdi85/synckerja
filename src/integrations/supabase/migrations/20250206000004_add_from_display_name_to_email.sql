-- Add from_display_name so we show "Nama akun email" instead of raw email in list and thread.
-- Parsed from From header: "Display Name <email@example.com>" -> from_display_name = "Display Name", from_email = "email@example.com"

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS from_display_name TEXT;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS from_display_name TEXT;

COMMENT ON COLUMN public.email_conversations.from_display_name IS 'Sender display name from From header (e.g. "Octa Vialdi"). Shown in Live Chat list instead of email.';
COMMENT ON COLUMN public.email_messages.from_display_name IS 'Sender display name from From header for this message. Shown in thread instead of email.';

-- Include from_display_name in RPC so list shows nama akun
DROP FUNCTION IF EXISTS public.get_email_conversations_with_preview(uuid);
CREATE OR REPLACE FUNCTION public.get_email_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email_connection_id UUID,
  from_email TEXT,
  from_display_name TEXT,
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
  ORDER BY m.created_at DESC NULLS LAST;
$$;
COMMENT ON FUNCTION public.get_email_conversations_with_preview(uuid) IS 'Email conversations with preview for Live Chat and Leads Management.';
