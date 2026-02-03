-- Add phone_number_id to whatsapp_conversations for multi-account WhatsApp.
-- For channel='whatsapp': which account (phone_number_id) this conversation belongs to.
-- For channel='instagram': NULL.
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT;

COMMENT ON COLUMN public.whatsapp_conversations.phone_number_id IS 'WhatsApp Phone Number ID for channel=whatsapp; NULL for instagram. Used for multi-account and send API.';

-- Backfill: set phone_number_id from organization_meta_config (single account) for existing WhatsApp conversations
UPDATE public.whatsapp_conversations c
SET phone_number_id = m.phone_number_id
FROM public.organization_meta_config m
WHERE c.organization_id = m.organization_id
  AND COALESCE(c.channel, 'whatsapp') = 'whatsapp'
  AND c.phone_number_id IS NULL
  AND m.phone_number_id IS NOT NULL;

-- If any still null (e.g. org now uses organization_whatsapp_accounts), set from first account
UPDATE public.whatsapp_conversations c
SET phone_number_id = (
  SELECT a.phone_number_id
  FROM public.organization_whatsapp_accounts a
  WHERE a.organization_id = c.organization_id
  ORDER BY a.updated_at DESC
  LIMIT 1
)
WHERE c.channel = 'whatsapp' AND c.phone_number_id IS NULL;

-- Drop old unique constraint
ALTER TABLE public.whatsapp_conversations
  DROP CONSTRAINT IF EXISTS uq_whatsapp_conversation_org_customer;

-- Partial unique: Instagram = one conversation per (org, customer_wa_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_conv_org_customer_instagram
  ON public.whatsapp_conversations (organization_id, customer_wa_id)
  WHERE channel = 'instagram' OR channel IS NULL;

-- Partial unique: WhatsApp = one conversation per (org, customer_wa_id, phone_number_id) when phone_number_id set
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_conv_org_customer_wa_phone
  ON public.whatsapp_conversations (organization_id, customer_wa_id, phone_number_id)
  WHERE channel = 'whatsapp' AND phone_number_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number_id
  ON public.whatsapp_conversations(phone_number_id)
  WHERE phone_number_id IS NOT NULL;
