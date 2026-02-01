-- Allow WhatsApp conversations to use the same lead status (Open, In Progress, Qualified, Converted, Lost, Closed)
-- so the Leads Management Status column shows a dropdown for both regular leads and WhatsApp chats.
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS lead_status_id UUID REFERENCES public.lead_statuses(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.whatsapp_conversations.lead_status_id IS 'Lead status (Open/In Progress/Qualified/Converted/Lost/Closed) for this conversation in Leads Management.';

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_status_id
  ON public.whatsapp_conversations(lead_status_id);
