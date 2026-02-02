-- Add channel to whatsapp_conversations: 'whatsapp' | 'instagram'
-- Inbound from WhatsApp → channel = 'whatsapp'; inbound from Instagram → channel = 'instagram'
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';

UPDATE public.whatsapp_conversations
  SET channel = 'whatsapp'
  WHERE channel IS NULL;

COMMENT ON COLUMN public.whatsapp_conversations.channel IS 'Source channel: whatsapp or instagram. Used for live chat unified inbox.';

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_channel
  ON public.whatsapp_conversations(channel);
