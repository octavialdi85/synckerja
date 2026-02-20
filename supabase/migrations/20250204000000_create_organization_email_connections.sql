-- Email connections per organization (one per connected email account).
-- inbound_address: address we display to user for Gmail forwarding (e.g. inbound-xxx@chat.domain.com).
-- confirmation_code: extracted from Gmail verification email when received via Resend inbound.
CREATE TABLE IF NOT EXISTS public.organization_email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  inbound_address TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified')),
  confirmation_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_org_email_connection_inbound UNIQUE (organization_id, inbound_address)
);

CREATE INDEX IF NOT EXISTS idx_organization_email_connections_organization_id
  ON public.organization_email_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_email_connections_inbound_address
  ON public.organization_email_connections(inbound_address);
CREATE INDEX IF NOT EXISTS idx_organization_email_connections_status
  ON public.organization_email_connections(status);

ALTER TABLE public.organization_email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org email connections"
  ON public.organization_email_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_email_connections.organization_id
    )
  );

CREATE POLICY "Users can insert own org email connections"
  ON public.organization_email_connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_id
    )
  );

CREATE POLICY "Users can update own org email connections"
  ON public.organization_email_connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_email_connections.organization_id
    )
  );

CREATE POLICY "Users can delete own org email connections"
  ON public.organization_email_connections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.active_organization_id = organization_email_connections.organization_id
    )
  );

CREATE OR REPLACE FUNCTION update_organization_email_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_email_connections_updated_at
  BEFORE UPDATE ON public.organization_email_connections
  FOR EACH ROW EXECUTE FUNCTION update_organization_email_connections_updated_at();

COMMENT ON TABLE public.organization_email_connections IS 'Email accounts connected for forwarding. User adds inbound_address in Gmail; we receive verification email and show confirmation_code in Live Chat.';
