-- Conversations: one per (organization, customer wa id)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_wa_id TEXT NOT NULL,
  customer_name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_whatsapp_conversation_org_customer UNIQUE (organization_id, customer_wa_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_organization_id ON public.whatsapp_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at ON public.whatsapp_conversations(last_message_at DESC NULLS LAST);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversations.organization_id)
  );

CREATE POLICY "Users can insert own org whatsapp conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id)
  );

CREATE POLICY "Users can update own org whatsapp conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversations.organization_id)
  );

-- Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id TEXT,
  body TEXT,
  message_type TEXT DEFAULT 'text',
  raw_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_messages.conversation_id
    )
  );

CREATE POLICY "Users can insert own org whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = whatsapp_messages.conversation_id
    )
  );

CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_conversations_updated_at();
