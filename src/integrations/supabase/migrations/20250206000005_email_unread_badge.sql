-- Email unread badge (like WhatsApp): read_at on messages, RPCs for count and mark read.

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.email_messages.read_at IS 'When the inbound message was read in Live Chat (NULL = unread). Used for unread badge.';

-- RPC: return unread count per email conversation for an organization (inbound messages with read_at IS NULL)
CREATE OR REPLACE FUNCTION public.get_email_unread_counts(p_organization_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS conversation_id, COUNT(m.id)::BIGINT AS unread_count
  FROM email_conversations c
  LEFT JOIN email_messages m ON m.conversation_id = c.id AND m.direction = 'inbound' AND m.read_at IS NULL
  WHERE c.organization_id = p_organization_id
  GROUP BY c.id
  HAVING COUNT(m.id) > 0;
$$;

COMMENT ON FUNCTION public.get_email_unread_counts(UUID) IS 'Unread count per email conversation for Live Chat badge (inbound messages not yet read).';

-- RPC: mark all inbound messages in an email conversation as read
CREATE OR REPLACE FUNCTION public.mark_email_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id AND direction = 'inbound' AND read_at IS NULL
  AND EXISTS (
    SELECT 1 FROM email_conversations c
    JOIN profiles p ON p.active_organization_id = c.organization_id AND p.user_id = auth.uid()
    WHERE c.id = email_messages.conversation_id
  );
END;
$$;

COMMENT ON FUNCTION public.mark_email_conversation_read(UUID) IS 'Mark all inbound email messages in conversation as read (for unread badge).';
