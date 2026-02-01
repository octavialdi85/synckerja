-- RPC: return conversation IDs that have at least one message whose body matches the search (untuk search di seluruh isi chat, bukan hanya last message)
CREATE OR REPLACE FUNCTION public.get_whatsapp_conversation_ids_by_message_search(
  p_organization_id UUID,
  p_search TEXT
)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.id
  FROM whatsapp_conversations c
  INNER JOIN whatsapp_messages m ON m.conversation_id = c.id
  WHERE c.organization_id = p_organization_id
    AND p_search IS NOT NULL
    AND length(trim(p_search)) > 0
    AND m.body IS NOT NULL
    AND m.body ILIKE '%' || trim(p_search) || '%';
$$;
