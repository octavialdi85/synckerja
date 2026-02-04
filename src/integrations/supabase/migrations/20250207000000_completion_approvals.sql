-- Completion approvals: assigner must approve when assignee marks task/step/substep complete.
-- Only assigner sees "Pending your approval"; on reject, entity is unchecked and assignee is notified.

BEGIN;

CREATE TABLE IF NOT EXISTS public.completion_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'step', 'substep')),
  daily_task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  task_step_id UUID REFERENCES public.task_steps(id) ON DELETE CASCADE,
  task_steps_to_steps_id UUID REFERENCES public.task_steps_to_steps(id) ON DELETE CASCADE,
  assignee_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigner_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  completed_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints: step must have task_step_id; substep must have task_steps_to_steps_id
ALTER TABLE public.completion_approvals
  ADD CONSTRAINT completion_approvals_step_has_task_step_id
  CHECK (entity_type != 'step' OR task_step_id IS NOT NULL);

ALTER TABLE public.completion_approvals
  ADD CONSTRAINT completion_approvals_substep_has_substep_id
  CHECK (entity_type != 'substep' OR task_steps_to_steps_id IS NOT NULL);

CREATE INDEX idx_completion_approvals_org_assigner_status
  ON public.completion_approvals(organization_id, assigner_employee_id, status);

CREATE INDEX idx_completion_approvals_assignee_status
  ON public.completion_approvals(assignee_employee_id, status);

CREATE INDEX idx_completion_approvals_daily_task_id
  ON public.completion_approvals(daily_task_id);

COMMENT ON TABLE public.completion_approvals IS 'Tracks completion approvals: assigner must approve when assignee marks task/step/substep complete.';

-- RLS
ALTER TABLE public.completion_approvals ENABLE ROW LEVEL SECURITY;

-- Select: assigner sees rows where they must approve; assignee sees rows (e.g. rejected) for their list
CREATE POLICY completion_approvals_select
  ON public.completion_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = completion_approvals.organization_id
        AND (
          completion_approvals.assigner_employee_id = e.id
          OR completion_approvals.assignee_employee_id = e.id
        )
    )
  );

-- Update: only assigner can approve/reject (update status from pending)
CREATE POLICY completion_approvals_update
  ON public.completion_approvals FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = completion_approvals.organization_id
        AND completion_approvals.assigner_employee_id = e.id
    )
  );

CREATE POLICY completion_approvals_insert
  ON public.completion_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = completion_approvals.organization_id
    )
  );

-- No delete policy: only status updates (approve/reject)

COMMIT;
