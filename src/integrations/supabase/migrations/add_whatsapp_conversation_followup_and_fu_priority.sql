-- Follow Up count and FU Priority for WhatsApp conversations (same as leads table).
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS followup INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fu_priority TEXT;

COMMENT ON COLUMN public.whatsapp_conversations.followup IS 'Number of follow-up updates for this conversation in Leads Management.';
COMMENT ON COLUMN public.whatsapp_conversations.fu_priority IS 'Follow-up priority (Low/Medium/High/Please Follow Up) derived from follow-up updates.';
