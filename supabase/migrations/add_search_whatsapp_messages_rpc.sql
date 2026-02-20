-- RPC: return message-level search results (seperti WhatsApp - setiap baris = satu pesan yang cocok, untuk highlight keyword)
CREATE OR REPLACE FUNCTION public.search_whatsapp_messages(
  p_organization_id UUID,
  p_search TEXT
)
RETURNS TABLE (
  conversation_id UUID,
  message_id UUID,
  body TEXT,
  created_at TIMESTAMPTZ,
  direction TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS conversation_id,
    m.id AS message_id,
    LEFT(m.body, 300) AS body,
    m.created_at,
    m.direction::TEXT
  FROM whatsapp_conversations c
  INNER JOIN whatsapp_messages m ON m.conversation_id = c.id
  WHERE c.organization_id = p_organization_id
    AND p_search IS NOT NULL
    AND length(trim(p_search)) > 0
    AND m.body IS NOT NULL
    AND m.body ILIKE '%' || trim(p_search) || '%'
  ORDER BY m.created_at DESC
  LIMIT 500;
$$;
