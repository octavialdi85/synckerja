-- Ensure organization_meta_config exists (fixes 404 from useWhatsAppConfig / WhatsAppConnectForm).
-- Ensure organization_whatsapp_accounts exists with expected schema.

-- 1) organization_meta_config: create if not exists (centralized Meta token + WhatsApp/Instagram per org)
CREATE TABLE IF NOT EXISTS public.organization_meta_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meta_access_token TEXT NOT NULL DEFAULT '',
  meta_business_manager_id TEXT,
  whatsapp_business_account_id TEXT NOT NULL DEFAULT '',
  verify_token TEXT NOT NULL DEFAULT '',
  phone_number_id TEXT,
  display_phone_number TEXT,
  whatsapp_business_name TEXT,
  name_status TEXT,
  facebook_page_id TEXT,
  facebook_verify_token TEXT,
  instagram_business_account_id TEXT,
  instagram_verify_token TEXT,
  instagram_username TEXT,
  instagram_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_org_meta_config UNIQUE (organization_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_meta_config_verify_token
  ON public.organization_meta_config(verify_token)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_organization_meta_config_organization_id
  ON public.organization_meta_config(organization_id);

ALTER TABLE public.organization_meta_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org meta config" ON public.organization_meta_config;
CREATE POLICY "Users can view own org meta config"
  ON public.organization_meta_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_meta_config.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own org meta config" ON public.organization_meta_config;
CREATE POLICY "Users can insert own org meta config"
  ON public.organization_meta_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

DROP POLICY IF EXISTS "Users can update own org meta config" ON public.organization_meta_config;
CREATE POLICY "Users can update own org meta config"
  ON public.organization_meta_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_meta_config.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can delete own org meta config" ON public.organization_meta_config;
CREATE POLICY "Users can delete own org meta config"
  ON public.organization_meta_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_meta_config.organization_id
    )
  );

CREATE OR REPLACE FUNCTION update_organization_meta_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organization_meta_config_updated_at ON public.organization_meta_config;
CREATE TRIGGER trigger_organization_meta_config_updated_at
  BEFORE UPDATE ON public.organization_meta_config
  FOR EACH ROW EXECUTE FUNCTION update_organization_meta_config_updated_at();


-- 2) organization_whatsapp_accounts: create if not exists (schema as requested)
CREATE TABLE IF NOT EXISTS public.organization_whatsapp_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  whatsapp_business_account_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  meta_access_token TEXT NULL,
  display_phone_number TEXT NULL,
  whatsapp_business_name TEXT NULL,
  name_status TEXT NULL,
  is_active BOOLEAN NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT organization_whatsapp_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT uq_org_whatsapp_account_phone UNIQUE (organization_id, phone_number_id),
  CONSTRAINT organization_whatsapp_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_whatsapp_accounts_organization_id
  ON public.organization_whatsapp_accounts(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_whatsapp_accounts_phone_number_id
  ON public.organization_whatsapp_accounts(phone_number_id);

ALTER TABLE public.organization_whatsapp_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org whatsapp accounts" ON public.organization_whatsapp_accounts;
CREATE POLICY "Users can view own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_whatsapp_accounts.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own org whatsapp accounts" ON public.organization_whatsapp_accounts;
CREATE POLICY "Users can insert own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

DROP POLICY IF EXISTS "Users can update own org whatsapp accounts" ON public.organization_whatsapp_accounts;
CREATE POLICY "Users can update own org whatsapp accounts"
  ON public.organization_whatsapp_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_whatsapp_accounts.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can delete own org whatsapp accounts" ON public.organization_whatsapp_accounts;
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

DROP TRIGGER IF EXISTS trigger_organization_whatsapp_accounts_updated_at ON public.organization_whatsapp_accounts;
CREATE TRIGGER trigger_organization_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.organization_whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_organization_whatsapp_accounts_updated_at();

COMMENT ON TABLE public.organization_whatsapp_accounts IS 'WhatsApp Business API accounts per organization. Max 3 per org (enforced in app).';
