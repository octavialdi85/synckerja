-- Revert: restore whatsapp_conversation_follow_up_updates and undo changes to lead_status_history.

-- 1. Re-create whatsapp_conversation_follow_up_updates (restore dropped table)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_follow_up_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  update_details TEXT NOT NULL,
  status TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_follow_up_conversation_id
  ON public.whatsapp_conversation_follow_up_updates(conversation_id);

ALTER TABLE public.whatsapp_conversation_follow_up_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org whatsapp conversation follow up updates" ON public.whatsapp_conversation_follow_up_updates;
CREATE POLICY "Users can view own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id));

DROP POLICY IF EXISTS "Users can insert own org whatsapp conversation follow up updates" ON public.whatsapp_conversation_follow_up_updates;
CREATE POLICY "Users can insert own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id));

DROP POLICY IF EXISTS "Users can update own org whatsapp conversation follow up updates" ON public.whatsapp_conversation_follow_up_updates;
CREATE POLICY "Users can update own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id));

DROP POLICY IF EXISTS "Users can delete own org whatsapp conversation follow up updates" ON public.whatsapp_conversation_follow_up_updates;
CREATE POLICY "Users can delete own org whatsapp conversation follow up updates"
  ON public.whatsapp_conversation_follow_up_updates FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.active_organization_id = whatsapp_conversation_follow_up_updates.organization_id));

COMMENT ON TABLE public.whatsapp_conversation_follow_up_updates IS 'Follow-up updates for WhatsApp conversations in Leads Management Follow Up form.';

-- 2. Copy data from lead_status_history (where conversation_id IS NOT NULL) back to whatsapp_conversation_follow_up_updates
INSERT INTO public.whatsapp_conversation_follow_up_updates (id, conversation_id, update_details, status, created_by, created_by_name, organization_id, created_at)
SELECT id, conversation_id, COALESCE(notes, ''), new_status, changed_by, changed_by_name, organization_id, COALESCE(changed_at, NOW())
FROM public.lead_status_history
WHERE conversation_id IS NOT NULL
  AND changed_by IS NOT NULL;

-- 3. Delete migrated rows from lead_status_history
DELETE FROM public.lead_status_history WHERE conversation_id IS NOT NULL;

-- 4. Drop column conversation_id and index from lead_status_history
DROP INDEX IF EXISTS public.idx_lead_status_history_conversation_id;
ALTER TABLE public.lead_status_history DROP COLUMN IF EXISTS conversation_id;

-- 5. Drop the UPDATE/DELETE policies we added on lead_status_history
DROP POLICY IF EXISTS "Users can update own org lead status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Users can delete own org lead status history" ON public.lead_status_history;
