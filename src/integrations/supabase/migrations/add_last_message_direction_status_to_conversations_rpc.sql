-- Extend get_whatsapp_conversations_with_preview to return last message direction and status (for checklist in list)
DROP FUNCTION IF EXISTS public.get_whatsapp_conversations_with_preview(UUID);

CREATE FUNCTION public.get_whatsapp_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  customer_wa_id TEXT,
  customer_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction TEXT,
  last_message_status TEXT,
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
    c.customer_wa_id,
    c.customer_name,
    m.created_at AS last_message_at,
    LEFT(m.body, 200) AS last_message_body,
    m.direction AS last_message_direction,
    m.status AS last_message_status,
    c.created_at,
    c.updated_at
  FROM whatsapp_conversations c
  LEFT JOIN LATERAL (
    SELECT created_at, body, direction, status
    FROM whatsapp_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.organization_id = p_organization_id
  ORDER BY m.created_at DESC NULLS LAST;
$$;
