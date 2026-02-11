-- Instagram: separate tables for DM (no mixing with whatsapp_conversations).
-- organization_instagram_accounts: multi-account per org
-- instagram_conversations, instagram_messages: Instagram DM only

-- 1) organization_instagram_accounts
CREATE TABLE IF NOT EXISTS public.organization_instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instagram_business_account_id TEXT NOT NULL,
  facebook_page_id TEXT,
  page_access_token TEXT,
  instagram_username TEXT,
  instagram_name TEXT,
  verify_token TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_org_instagram_account UNIQUE (organization_id, instagram_business_account_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_instagram_accounts_organization_id
  ON public.organization_instagram_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_instagram_accounts_ig_business_id
  ON public.organization_instagram_accounts(instagram_business_account_id);

ALTER TABLE public.organization_instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram accounts"
  ON public.organization_instagram_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_instagram_accounts.organization_id
    )
  );

CREATE POLICY "Users can insert own org instagram accounts"
  ON public.organization_instagram_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

CREATE POLICY "Users can update own org instagram accounts"
  ON public.organization_instagram_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_instagram_accounts.organization_id
    )
  );

CREATE POLICY "Users can delete own org instagram accounts"
  ON public.organization_instagram_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_instagram_accounts.organization_id
    )
  );

CREATE OR REPLACE FUNCTION update_organization_instagram_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_instagram_accounts_updated_at
  BEFORE UPDATE ON public.organization_instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION update_organization_instagram_accounts_updated_at();

COMMENT ON TABLE public.organization_instagram_accounts IS 'Instagram Business/Creator accounts per organization. Used for DM and webhook.';

-- 2) instagram_conversations
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instagram_business_account_id TEXT NOT NULL,
  customer_ig_id TEXT NOT NULL,
  customer_name TEXT,
  customer_external_id TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_body TEXT,
  last_message_direction TEXT,
  last_message_status TEXT,
  lead_status_id UUID REFERENCES public.lead_statuses(id) ON DELETE SET NULL,
  first_inbound_at TIMESTAMP WITH TIME ZONE,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ticket_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_instagram_conv_org_account_customer UNIQUE (organization_id, instagram_business_account_id, customer_ig_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_organization_id
  ON public.instagram_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_last_message_at
  ON public.instagram_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_ig_business_id
  ON public.instagram_conversations(instagram_business_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_assignee_id
  ON public.instagram_conversations(assignee_id);

ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram conversations"
  ON public.instagram_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = instagram_conversations.organization_id
    )
  );

CREATE POLICY "Users can insert own org instagram conversations"
  ON public.instagram_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

CREATE POLICY "Users can update own org instagram conversations"
  ON public.instagram_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = instagram_conversations.organization_id
    )
  );

CREATE POLICY "Users can delete own org instagram conversations"
  ON public.instagram_conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = instagram_conversations.organization_id
    )
  );

CREATE OR REPLACE FUNCTION update_instagram_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instagram_conversations_updated_at
  BEFORE UPDATE ON public.instagram_conversations
  FOR EACH ROW EXECUTE FUNCTION update_instagram_conversations_updated_at();

COMMENT ON TABLE public.instagram_conversations IS 'Instagram DM conversations. One per (org, instagram_business_account_id, customer_ig_id).';

-- 3) instagram_messages
CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  platform_message_id TEXT,
  body TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  raw_metadata JSONB,
  status TEXT,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  reply_to_platform_message_id TEXT,
  reply_to_body TEXT,
  reply_to_message_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation_id
  ON public.instagram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_created_at
  ON public.instagram_messages(created_at);

ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram messages"
  ON public.instagram_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = instagram_messages.conversation_id
    )
  );

CREATE POLICY "Users can insert own org instagram messages"
  ON public.instagram_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = conversation_id
    )
  );

CREATE POLICY "Users can update own org instagram messages"
  ON public.instagram_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
      WHERE c.id = instagram_messages.conversation_id
    )
  );

COMMENT ON TABLE public.instagram_messages IS 'Instagram DM messages.';

-- 4) Enable Realtime for instagram_conversations and instagram_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_messages;
