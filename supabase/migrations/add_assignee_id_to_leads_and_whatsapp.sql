-- Assignee ownership: only the assigned agent sees the lead/chat in their "room".
-- No new tables; add assignee_id (FK to employees) so we can filter by current user's employee.

-- 1) leads: add assignee_id (keep assignee text for display/backward compatibility)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assignee_id ON public.leads(assignee_id);
COMMENT ON COLUMN public.leads.assignee_id IS 'Employee responsible for this lead; only this agent sees it in their room.';

-- 2) whatsapp_conversations: add assignee_id
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assignee_id ON public.whatsapp_conversations(assignee_id);
COMMENT ON COLUMN public.whatsapp_conversations.assignee_id IS 'Employee responsible for this conversation; only this agent sees it in their room.';
