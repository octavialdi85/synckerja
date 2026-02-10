-- Move verify_token to organization_whatsapp_accounts (webhook GET reads from here).
-- One value per org; stored on first account. organization_meta_config still holds it for legacy/fallback.

ALTER TABLE public.organization_whatsapp_accounts
  ADD COLUMN IF NOT EXISTS verify_token TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_whatsapp_accounts_verify_token
  ON public.organization_whatsapp_accounts(verify_token)
  WHERE verify_token IS NOT NULL AND trim(verify_token) <> '';

COMMENT ON COLUMN public.organization_whatsapp_accounts.verify_token IS 'Meta webhook Verify Token for this org. Used in GET hub.verify_token; one value per org (e.g. on first account).';

-- Backfill from organization_meta_config to first account per org
UPDATE public.organization_whatsapp_accounts a
SET verify_token = COALESCE(trim(m.verify_token), '')
FROM public.organization_meta_config m
WHERE m.organization_id = a.organization_id
  AND COALESCE(trim(m.verify_token), '') <> ''
  AND a.id = (
    SELECT id FROM public.organization_whatsapp_accounts a2
    WHERE a2.organization_id = m.organization_id AND (a2.is_active = true OR a2.is_active IS NULL)
    ORDER BY a2.created_at ASC NULLS LAST
    LIMIT 1
  );
