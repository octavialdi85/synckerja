-- RPC: get_instagram_conversations_with_preview (Owner/Admin see all; Employee see only assigned)

CREATE OR REPLACE FUNCTION public.get_instagram_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  customer_ig_id TEXT,
  customer_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction TEXT,
  last_message_status TEXT,
  lead_status_id UUID,
  lead_status_name TEXT,
  instagram_business_account_id TEXT,
  instagram_account_display_name TEXT,
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
    c.customer_ig_id,
    c.customer_name,
    m.created_at AS last_message_at,
    LEFT(m.body, 200) AS last_message_body,
    m.direction AS last_message_direction,
    m.status AS last_message_status,
    c.lead_status_id,
    ls.name AS lead_status_name,
    c.instagram_business_account_id,
    COALESCE(
      CASE WHEN a.instagram_username IS NOT NULL AND TRIM(a.instagram_username) <> '' THEN '@' || TRIM(a.instagram_username) END,
      NULLIF(TRIM(COALESCE(a.instagram_name, '')), ''),
      a.instagram_business_account_id
    )::TEXT AS instagram_account_display_name,
    c.created_at,
    c.updated_at
  FROM instagram_conversations c
  LEFT JOIN lead_statuses ls ON ls.id = c.lead_status_id
  LEFT JOIN organization_instagram_accounts a
    ON a.organization_id = c.organization_id
   AND a.instagram_business_account_id = c.instagram_business_account_id
   AND a.is_active = true
  LEFT JOIN LATERAL (
    SELECT created_at, body, direction, status
    FROM instagram_messages
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

COMMENT ON FUNCTION public.get_instagram_conversations_with_preview(UUID) IS 'Instagram DM conversations with preview. Owner/Admin see all; Employee see only assigned.';
