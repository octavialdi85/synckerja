-- Add cc and bcc columns to email_messages for outbound replies (Gmail-style compose).
-- Values are stored when user sends with CC/BCC so we have a record per message.
ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS cc TEXT,
  ADD COLUMN IF NOT EXISTS bcc TEXT;

COMMENT ON COLUMN public.email_messages.cc IS 'CC recipients for outbound message (comma-separated if multiple).';
COMMENT ON COLUMN public.email_messages.bcc IS 'BCC recipients for outbound message (comma-separated if multiple).';
