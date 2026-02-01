-- Add read_at for inbound messages so we can show unread per conversation
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_read_at ON public.whatsapp_messages(conversation_id, read_at) WHERE direction = 'inbound';
