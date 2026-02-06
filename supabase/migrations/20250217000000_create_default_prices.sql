-- Default prices per Service + Category (sub_service) for lead conversion amount.
-- General name: applies to services or products.

CREATE TABLE IF NOT EXISTS public.default_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE CASCADE,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_default_prices_org_service_sub UNIQUE (organization_id, service_id, sub_service_id)
);

CREATE INDEX IF NOT EXISTS idx_default_prices_lookup
  ON public.default_prices(organization_id, service_id, sub_service_id);

COMMENT ON TABLE public.default_prices IS 'Default unit price per Service + Category for auto-filling amount on lead conversion.';

ALTER TABLE public.default_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org default_prices"
  ON public.default_prices FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = default_prices.organization_id));

CREATE POLICY "Users can insert own org default_prices"
  ON public.default_prices FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = default_prices.organization_id));

CREATE POLICY "Users can update own org default_prices"
  ON public.default_prices FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = default_prices.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = default_prices.organization_id));

CREATE POLICY "Users can delete own org default_prices"
  ON public.default_prices FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = default_prices.organization_id));
