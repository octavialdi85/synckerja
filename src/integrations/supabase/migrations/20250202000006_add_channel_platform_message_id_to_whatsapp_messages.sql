-- Add channel and platform_message_id to whatsapp_messages for consistency with conversations.
-- channel: 'whatsapp' | 'instagram'. Send decision uses whatsapp_conversations.channel; this is for data consistency.
-- platform_message_id: Meta message ID (same as wa_message_id; kept for reporting/consistency).
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS platform_message_id TEXT;

UPDATE public.whatsapp_messages
SET channel = COALESCE(channel, 'whatsapp')
WHERE channel IS NULL;

UPDATE public.whatsapp_messages
SET platform_message_id = wa_message_id
WHERE platform_message_id IS NULL AND wa_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN channel SET DEFAULT 'whatsapp';

COMMENT ON COLUMN public.whatsapp_messages.channel IS 'Source channel: whatsapp or instagram. Matches conversation channel for consistency.';
COMMENT ON COLUMN public.whatsapp_messages.platform_message_id IS 'Meta/WhatsApp/Instagram message ID. Same as wa_message_id for compatibility.';
