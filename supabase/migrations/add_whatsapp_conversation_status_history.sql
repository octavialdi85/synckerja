-- Status change history for WhatsApp conversations (same concept as lead_status_history for leads).
-- Used by the Status History modal when viewing history for a WhatsApp lead.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_status_history_conversation_id
  ON public.whatsapp_conversation_status_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_status_history_changed_at
  ON public.whatsapp_conversation_status_history(changed_at DESC);

ALTER TABLE public.whatsapp_conversation_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp conversation status history"
  ON public.whatsapp_conversation_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_status_history.organization_id)
  );

CREATE POLICY "Users can insert own org whatsapp conversation status history"
  ON public.whatsapp_conversation_status_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_status_history.organization_id)
  );

COMMENT ON TABLE public.whatsapp_conversation_status_history IS 'Status change history for WhatsApp conversations shown in Leads Management Status History modal.';
