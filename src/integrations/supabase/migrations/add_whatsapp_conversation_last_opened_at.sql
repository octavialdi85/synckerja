-- Track when a conversation was last opened in livechat (for leads-management "Status" column)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.whatsapp_conversations.last_opened_at IS 'Set when user opens this conversation in /operations/consultant/all/livechat';
