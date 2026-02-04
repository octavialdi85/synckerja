-- Add lead_status_id, followup, fu_priority to email_conversations (same as whatsapp_conversations)
-- so Quick Action panel and Leads Management behave the same for email.

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS lead_status_id UUID REFERENCES public.lead_statuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS followup INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fu_priority TEXT;

COMMENT ON COLUMN public.email_conversations.lead_status_id IS 'Lead status (Open/In Progress/Qualified/Converted/Lost/Closed) for Quick Action and Leads Management.';
COMMENT ON COLUMN public.email_conversations.followup IS 'Number of follow-up updates for this conversation.';
COMMENT ON COLUMN public.email_conversations.fu_priority IS 'Follow-up priority (Low/Medium/High) derived from follow-up updates.';

CREATE INDEX IF NOT EXISTS idx_email_conversations_lead_status_id
  ON public.email_conversations(lead_status_id);

-- Follow-up updates for email conversations (same concept as whatsapp_conversation_follow_up_updates)
CREATE TABLE IF NOT EXISTS public.email_conversation_follow_up_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.email_conversations(id) ON DELETE CASCADE,
  update_details TEXT NOT NULL,
  status TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_conv_follow_up_conversation_id
  ON public.email_conversation_follow_up_updates(conversation_id);

ALTER TABLE public.email_conversation_follow_up_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org email conversation follow up updates"
  ON public.email_conversation_follow_up_updates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can insert own org email conversation follow up updates"
  ON public.email_conversation_follow_up_updates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can update own org email conversation follow up updates"
  ON public.email_conversation_follow_up_updates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversation_follow_up_updates.organization_id)
  );

CREATE POLICY "Users can delete own org email conversation follow up updates"
  ON public.email_conversation_follow_up_updates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = email_conversation_follow_up_updates.organization_id)
  );

COMMENT ON TABLE public.email_conversation_follow_up_updates IS 'Follow-up updates for email conversations in Quick Action and Leads Management.';

-- Must DROP before changing return type (PostgreSQL does not allow changing OUT params with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.get_email_conversations_with_preview(uuid);

-- Recreate with lead_status_id, followup, fu_priority in return (for Leads Management and Quick Action)
CREATE OR REPLACE FUNCTION public.get_email_conversations_with_preview(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email_connection_id UUID,
  from_email TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction TEXT,
  email_connection_display TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  lead_status_id UUID,
  followup INTEGER,
  fu_priority TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.organization_id,
    c.email_connection_id,
    c.from_email,
    m.created_at AS last_message_at,
    LEFT(m.body, 200) AS last_message_body,
    m.direction AS last_message_direction,
    COALESCE(NULLIF(TRIM(conn.email_address), ''), conn.inbound_address)::TEXT AS email_connection_display,
    c.created_at,
    c.updated_at,
    c.lead_status_id,
    COALESCE(c.followup, 0),
    c.fu_priority
  FROM email_conversations c
  JOIN organization_email_connections conn ON conn.id = c.email_connection_id AND conn.organization_id = c.organization_id
  LEFT JOIN LATERAL (
    SELECT created_at, body, direction
    FROM email_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.organization_id = p_organization_id
  ORDER BY m.created_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_email_conversations_with_preview(uuid) IS 'Email conversations with preview for Live Chat and Leads Management.';
