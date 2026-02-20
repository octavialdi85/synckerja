-- Tabel riwayat perubahan status lead. Dipakai oleh modal Status History di Leads Management.
CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id
  ON public.lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at
  ON public.lead_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_organization_id
  ON public.lead_status_history(organization_id);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org lead status history" ON public.lead_status_history;
CREATE POLICY "Users can view own org lead status history"
  ON public.lead_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = lead_status_history.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert own org lead status history" ON public.lead_status_history;
CREATE POLICY "Users can insert own org lead status history"
  ON public.lead_status_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = lead_status_history.organization_id)
  );

COMMENT ON TABLE public.lead_status_history IS 'Status change history for leads; shown in Leads Management Status History modal.';
