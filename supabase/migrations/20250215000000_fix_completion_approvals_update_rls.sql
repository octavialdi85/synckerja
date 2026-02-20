-- Fix completion_approvals UPDATE RLS: allow assigner to update row to approved/rejected.
-- Previously the policy had only USING (status = 'pending'). PostgreSQL uses USING for WITH CHECK
-- when WITH CHECK is omitted, so the NEW row (status = 'rejected' or 'approved') failed the check.
-- Add explicit WITH CHECK so the updated row is allowed as long as current user is the assigner.

DROP POLICY IF EXISTS completion_approvals_update ON public.completion_approvals;

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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.organization_id = completion_approvals.organization_id
        AND completion_approvals.assigner_employee_id = e.id
    )
  );

COMMENT ON POLICY completion_approvals_update ON public.completion_approvals IS
  'Assigner can update pending rows to approved/rejected; WITH CHECK allows new status.';
