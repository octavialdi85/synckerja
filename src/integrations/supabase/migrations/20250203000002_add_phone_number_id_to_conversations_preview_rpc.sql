-- Extend get_whatsapp_conversations_with_preview to return phone_number_id and whatsapp_account_display_name
-- for multi-account indicator in inbox.
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
  lead_status_id UUID,
  lead_status_name TEXT,
  channel TEXT,
  phone_number_id TEXT,
  whatsapp_account_display_name TEXT,
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
    c.lead_status_id,
    ls.name AS lead_status_name,
    COALESCE(c.channel, 'whatsapp') AS channel,
    c.phone_number_id,
    COALESCE(
      NULLIF(TRIM(a.whatsapp_business_name), ''),
      NULLIF(TRIM(a.display_phone_number), ''),
      a.phone_number_id
    )::TEXT AS whatsapp_account_display_name,
    c.created_at,
    c.updated_at
  FROM whatsapp_conversations c
  LEFT JOIN lead_statuses ls ON ls.id = c.lead_status_id
  LEFT JOIN organization_whatsapp_accounts a
    ON a.organization_id = c.organization_id
   AND a.phone_number_id = c.phone_number_id
   AND a.is_active = true
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
