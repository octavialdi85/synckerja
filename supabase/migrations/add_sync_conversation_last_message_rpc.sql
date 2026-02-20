-- RPC: sync conversation last_message_at and last_message_body from the actual latest message
-- Call from webhook after inserting a message so preview is always correct
CREATE OR REPLACE FUNCTION public.sync_conversation_last_message(p_conversation_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.whatsapp_conversations c
  SET
    last_message_at = m.created_at,
    last_message_body = LEFT(m.body, 200),
    updated_at = NOW()
  FROM (
    SELECT conversation_id, created_at, body
    FROM public.whatsapp_messages
    WHERE conversation_id = p_conversation_id
    ORDER BY created_at DESC
    LIMIT 1
  ) m
  WHERE c.id = p_conversation_id AND c.id = m.conversation_id;
$$;
