-- Follow-up updates for WhatsApp conversations (same concept as lead_follow_up_updates for leads).
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_follow_up_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  update_details TEXT NOT NULL,
  status TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_follow_up_conversation_id
  ON public.whatsapp_conversation_follow_up_updates(conversation_id);

ALTER TABLE public.whatsapp_conversation_follow_up_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can insert own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can update own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can delete own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id)
  );

COMMENT ON TABLE public.whatsapp_conversation_follow_up_updates IS 'Follow-up updates for WhatsApp conversations in Leads Management Follow Up form.';
