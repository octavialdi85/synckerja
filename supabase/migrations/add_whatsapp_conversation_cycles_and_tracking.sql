-- Resolve-cycle tracking: per-cycle response time and time-to-resolve
-- Cycle = from first inbound (Unread/Open) -> first response (On going) -> resolved (Closed).
-- When same contact chats again after resolve, a new cycle starts.

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS first_inbound_at TIMESTAMPTZ;

COMMENT ON COLUMN public.whatsapp_conversations.first_inbound_at IS 'Timestamp of the very first inbound message for this conversation (ever).';

CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  cycle_started_at TIMESTAMPTZ NOT NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_conversation_cycles IS 'One row per resolve cycle: from first inbound (Unread) to first agent reply (On going) to resolved (Closed). Reopened chats start a new cycle.';
COMMENT ON COLUMN public.whatsapp_conversation_cycles.cycle_started_at IS 'When this cycle started: first inbound (new conv or after previous resolve).';
COMMENT ON COLUMN public.whatsapp_conversation_cycles.first_response_at IS 'When agent first replied in this cycle (status became On going). Used for response time.';
COMMENT ON COLUMN public.whatsapp_conversation_cycles.resolved_at IS 'When status was set to Closed (Resolve) for this cycle. Used for time-to-resolve.';

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_cycles_conversation_id
  ON public.whatsapp_conversation_cycles(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_cycles_resolved_at
  ON public.whatsapp_conversation_cycles(resolved_at) WHERE resolved_at IS NOT NULL;

ALTER TABLE public.whatsapp_conversation_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp conversation cycles"
  ON public.whatsapp_conversation_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_conversation_cycles.conversation_id
    )
  );

CREATE POLICY "Users can insert own org whatsapp conversation cycles"
  ON public.whatsapp_conversation_cycles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_conversation_cycles.conversation_id
    )
  );

CREATE POLICY "Users can update own org whatsapp conversation cycles"
  ON public.whatsapp_conversation_cycles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_conversation_cycles.conversation_id
    )
  );

CREATE OR REPLACE FUNCTION update_whatsapp_conversation_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_conversation_cycles_updated_at
  BEFORE UPDATE ON public.whatsapp_conversation_cycles
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_conversation_cycles_updated_at();
