-- Add conversation_id to lead_status_history (FK to whatsapp_conversations).
ALTER TABLE public.lead_status_history
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lead_status_history_conversation_id
  ON public.lead_status_history(conversation_id);

COMMENT ON COLUMN public.lead_status_history.conversation_id IS 'When set, this history row is from a WhatsApp/Instagram conversation follow-up (migrated from whatsapp_conversation_follow_up_updates).';

-- Allow edit/delete for own org (used by Lead Follow Up form).
DROP POLICY IF EXISTS "Users can update own org lead status history" ON public.lead_status_history;
CREATE POLICY "Users can update own org lead status history"
  ON public.lead_status_history FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = lead_status_history.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = lead_status_history.organization_id));

DROP POLICY IF EXISTS "Users can delete own org lead status history" ON public.lead_status_history;
CREATE POLICY "Users can delete own org lead status history"
  ON public.lead_status_history FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = lead_status_history.organization_id));

-- Migrate existing rows only if old table still exists (idempotent: safe when table was already dropped).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_conversation_follow_up_updates') THEN
    INSERT INTO public.lead_status_history (
      lead_id,
      conversation_id,
      old_status,
      new_status,
      changed_at,
      changed_by,
      changed_by_name,
      notes,
      organization_id,
      created_at
    )
    SELECT
      l.id,
      f.conversation_id,
      NULL,
      COALESCE(NULLIF(TRIM(f.status), ''), 'Follow-up'),
      COALESCE(f.created_at, NOW()),
      f.created_by,
      f.created_by_name,
      f.update_details,
      f.organization_id,
      COALESCE(f.created_at, NOW())
    FROM public.whatsapp_conversation_follow_up_updates f
    JOIN public.whatsapp_conversations w ON w.id = f.conversation_id
    JOIN public.leads l ON l.ticket_id = w.ticket_id AND l.organization_id = f.organization_id;
    DROP TABLE IF EXISTS public.whatsapp_conversation_follow_up_updates;
  END IF;
END $$;
