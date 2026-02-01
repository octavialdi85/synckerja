ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_message_id ON public.whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
