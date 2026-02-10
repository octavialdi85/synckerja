-- Livechat: filter conversations by role and assignee.
-- Owner/Admin see all; Employee only see conversations assigned to them (backend-enforced).

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
  AND (
    (SELECT ur.role FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.organization_id = p_organization_id LIMIT 1) IN ('owner', 'admin')
    OR (
      (SELECT e.id FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = p_organization_id LIMIT 1) IS NOT NULL
      AND c.assignee_id = (SELECT e.id FROM employees e WHERE e.user_id = auth.uid() AND e.organization_id = p_organization_id LIMIT 1)
    )
  )
  ORDER BY m.created_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_whatsapp_conversations_with_preview(UUID) IS 'WhatsApp/Instagram conversations with preview. Owner/Admin see all; Employee see only assigned.';

DROP FUNCTION IF EXISTS public.get_email_conversations_with_preview(uuid);

CREATE FUNCTION public.get_email_conversations_with_preview(p_organization_id UUID)
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

COMMENT ON FUNCTION public.get_email_conversations_with_preview(uuid) IS 'Email conversations with preview. Owner/Admin see all; Employee see only where lead is assigned to them.';
