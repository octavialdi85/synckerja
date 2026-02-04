-- Normalize from_email to lowercase so email-inbound lookup (one room per sender) finds existing conversations.
UPDATE public.email_conversations
SET from_email = LOWER(TRIM(from_email))
WHERE from_email IS NOT NULL
  AND from_email <> LOWER(TRIM(from_email));

COMMENT ON COLUMN public.email_conversations.from_email IS 'Sender email (normalized lowercase). One conversation per (email_connection_id, from_email).';
