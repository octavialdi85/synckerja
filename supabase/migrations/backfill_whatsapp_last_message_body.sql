-- Backfill last_message_body from the latest message per conversation
UPDATE public.whatsapp_conversations c
SET last_message_body = (
  SELECT LEFT(m.body, 200)
  FROM public.whatsapp_messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.whatsapp_messages m
  WHERE m.conversation_id = c.id
);
