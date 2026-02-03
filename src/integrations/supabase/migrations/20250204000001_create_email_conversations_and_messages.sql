-- Email conversations: one per (organization, email_connection) thread (e.g. verification thread or forwarded thread).
CREATE TABLE IF NOT EXISTS public.email_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_connection_id UUID NOT NULL REFERENCES public.organization_email_connections(id) ON DELETE CASCADE,
  from_email TEXT,
  thread_subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_conversations_organization_id ON public.email_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_email_connection_id ON public.email_conversations(email_connection_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_last_message_at ON public.email_conversations(last_message_at DESC NULLS LAST);

ALTER TABLE public.email_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org email conversations"
  ON public.email_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversations.organization_id)
  );

CREATE POLICY "Users can insert own org email conversations"
  ON public.email_conversations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id)
  );

CREATE POLICY "Users can update own org email conversations"
  ON public.email_conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversations.organization_id)
  );

-- Email messages (inbound/outbound).
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.email_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  body TEXT,
  confirmation_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON public.email_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_created_at ON public.email_messages(created_at);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org email messages"
  ON public.email_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = email_messages.conversation_id
    )
  );

CREATE POLICY "Users can insert own org email messages"
  ON public.email_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = email_messages.conversation_id
    )
  );

CREATE OR REPLACE FUNCTION update_email_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_conversations_updated_at
  BEFORE UPDATE ON public.email_conversations
  FOR EACH ROW EXECUTE FUNCTION update_email_conversations_updated_at();

COMMENT ON TABLE public.email_conversations IS 'Email threads per connection. Shown in Live Chat alongside WhatsApp/Instagram.';
COMMENT ON COLUMN public.email_messages.confirmation_code IS 'Extracted from Gmail verification email body; user copies to Gmail forwarding settings.';
