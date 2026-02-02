-- Ensure unique constraint on (organization_id, customer_wa_id) for upsert in whatsapp-webhook.
-- Fixes: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_conversations'::regclass
      AND conname = 'uq_whatsapp_conversation_org_customer'
  ) THEN
    ALTER TABLE public.whatsapp_conversations
    ADD CONSTRAINT uq_whatsapp_conversation_org_customer UNIQUE (organization_id, customer_wa_id);
  END IF;
END $$;
