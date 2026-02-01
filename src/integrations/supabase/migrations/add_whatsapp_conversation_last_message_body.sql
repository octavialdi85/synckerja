-- Show last message content in conversation list instead of phone number
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS last_message_body TEXT;
