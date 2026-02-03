-- Multi-account WhatsApp: one row per (org, phone_number_id). Max 3 per org (enforced in app).
-- Token: use meta_access_token from this row if set; else use organization_meta_config.meta_access_token (shared).
CREATE TABLE IF NOT EXISTS public.organization_whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_business_account_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  meta_access_token TEXT,
  display_phone_number TEXT,
  whatsapp_business_name TEXT,
  name_status TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_org_whatsapp_account_phone UNIQUE (organization_id, phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_whatsapp_accounts_organization_id
  ON public.organization_whatsapp_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_whatsapp_accounts_phone_number_id
  ON public.organization_whatsapp_accounts(phone_number_id);

ALTER TABLE public.organization_whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_whatsapp_accounts.organization_id
    )
  );

CREATE POLICY "Users can insert own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

CREATE POLICY "Users can update own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_whatsapp_accounts.organization_id
    )
  );

CREATE POLICY "Users can delete own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_whatsapp_accounts.organization_id
    )
  );

CREATE OR REPLACE FUNCTION update_organization_whatsapp_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.organization_whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_organization_whatsapp_accounts_updated_at();

-- Migrate existing single account from organization_meta_config
INSERT INTO public.organization_whatsapp_accounts (
  organization_id,
  whatsapp_business_account_id,
  phone_number_id,
  meta_access_token,
  display_phone_number,
  whatsapp_business_name,
  name_status,
  is_active,
  updated_at
)
SELECT
  organization_id,
  COALESCE(whatsapp_business_account_id, ''),
  phone_number_id,
  meta_access_token,
  display_phone_number,
  whatsapp_business_name,
  name_status,
  COALESCE(is_active, TRUE),
  updated_at
FROM public.organization_meta_config
WHERE phone_number_id IS NOT NULL AND TRIM(phone_number_id) <> ''
ON CONFLICT (organization_id, phone_number_id) DO NOTHING;

COMMENT ON TABLE public.organization_whatsapp_accounts IS 'WhatsApp Business API accounts per organization. Max 3 per org (enforced in app). Token from row or shared from organization_meta_config.';
