-- RPC: return unread count per conversation for an organization
CREATE OR REPLACE FUNCTION public.get_whatsapp_unread_counts(p_organization_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS conversation_id, COUNT(m.id)::BIGINT AS unread_count
  FROM whatsapp_conversations c
  LEFT JOIN whatsapp_messages m ON m.conversation_id = c.id AND m.direction = 'inbound' AND m.read_at IS NULL
  WHERE c.organization_id = p_organization_id
  GROUP BY c.id;
$$;

-- RLS: only allow if user belongs to the organization
ALTER FUNCTION public.get_whatsapp_unread_counts(UUID) SET search_path = public;

-- RPC: mark all inbound messages in a conversation as read
CREATE OR REPLACE FUNCTION public.mark_whatsapp_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE whatsapp_messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id AND direction = 'inbound' AND read_at IS NULL
  AND EXISTS (
    SELECT 1 FROM whatsapp_conversations c
    JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
    WHERE c.id = whatsapp_messages.conversation_id
  );
END;
$$;
