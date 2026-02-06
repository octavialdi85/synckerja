-- Add conversation_id to lead_follow_up_updates (FK to whatsapp_conversations).
ALTER TABLE public.lead_follow_up_updates
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_updates_conversation_id
  ON public.lead_follow_up_updates(conversation_id);

COMMENT ON COLUMN public.lead_follow_up_updates.conversation_id IS 'When set, this row is from a WhatsApp/Instagram conversation follow-up (migrated from whatsapp_conversation_follow_up_updates).';

-- Migrate existing rows: whatsapp_conversation_follow_up_updates -> lead_follow_up_updates.
-- Only migrate where we have a matching lead (by ticket_id).
INSERT INTO public.lead_follow_up_updates (
  lead_id,
  conversation_id,
  update_details,
  status,
  created_by,
  created_by_name,
  organization_id,
  created_at
)
SELECT
  l.id,
  f.conversation_id,
  f.update_details,
  f.status,
  f.created_by,
  f.created_by_name,
  f.organization_id,
  COALESCE(f.created_at, NOW())
FROM public.whatsapp_conversation_follow_up_updates f
JOIN public.whatsapp_conversations w ON w.id = f.conversation_id
JOIN public.leads l ON l.ticket_id = w.ticket_id AND l.organization_id = f.organization_id;

-- Drop the old table.
DROP TABLE IF EXISTS public.whatsapp_conversation_follow_up_updates;
