-- SOP (Workflow) templates: one per default_prices. General use (e.g. project steps before/on/after "Hari H").

CREATE TABLE IF NOT EXISTS public.sop_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_price_id UUID NOT NULL REFERENCES public.default_prices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_sop_templates_default_price UNIQUE (default_price_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_templates_default_price
  ON public.sop_templates(default_price_id);
CREATE INDEX IF NOT EXISTS idx_sop_templates_organization
  ON public.sop_templates(organization_id);

COMMENT ON TABLE public.sop_templates IS 'One workflow/SOP template per default_price (Service + Sub Service).';

ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sop_templates"
  ON public.sop_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = sop_templates.organization_id));

CREATE POLICY "Users can insert own org sop_templates"
  ON public.sop_templates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = sop_templates.organization_id));

CREATE POLICY "Users can update own org sop_templates"
  ON public.sop_templates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = sop_templates.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = sop_templates.organization_id));

CREATE POLICY "Users can delete own org sop_templates"
  ON public.sop_templates FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = sop_templates.organization_id));

-- SOP template steps: order, title, schedule_type (days_before_h | hari_h | working_days_after_h), schedule_value.

CREATE TABLE IF NOT EXISTS public.sop_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_template_id UUID NOT NULL REFERENCES public.sop_templates(id) ON DELETE CASCADE,
  "order" INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('days_before_h', 'hari_h', 'working_days_after_h')),
  schedule_value INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_template_steps_template
  ON public.sop_template_steps(sop_template_id);

COMMENT ON TABLE public.sop_template_steps IS 'Steps of an SOP template; schedule_type drives due date calculation from Hari H.';

ALTER TABLE public.sop_template_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sop_template_steps via org"
  ON public.sop_template_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sop_templates st
    JOIN profiles p ON p.active_organization_id = st.organization_id AND p.user_id = auth.uid()
    WHERE st.id = sop_template_steps.sop_template_id
  ));

CREATE POLICY "Users can insert sop_template_steps via org"
  ON public.sop_template_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sop_templates st
    JOIN profiles p ON p.active_organization_id = st.organization_id AND p.user_id = auth.uid()
    WHERE st.id = sop_template_steps.sop_template_id
  ));

CREATE POLICY "Users can update sop_template_steps via org"
  ON public.sop_template_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.sop_templates st
    JOIN profiles p ON p.active_organization_id = st.organization_id AND p.user_id = auth.uid()
    WHERE st.id = sop_template_steps.sop_template_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sop_templates st
    JOIN profiles p ON p.active_organization_id = st.organization_id AND p.user_id = auth.uid()
    WHERE st.id = sop_template_steps.sop_template_id
  ));

CREATE POLICY "Users can delete sop_template_steps via org"
  ON public.sop_template_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.sop_templates st
    JOIN profiles p ON p.active_organization_id = st.organization_id AND p.user_id = auth.uid()
    WHERE st.id = sop_template_steps.sop_template_id
  ));
