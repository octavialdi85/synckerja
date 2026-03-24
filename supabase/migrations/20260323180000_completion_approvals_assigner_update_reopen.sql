-- Allow assigner to UPDATE completion_approvals rows they own in any current status.
-- Previously USING (status = 'pending') blocked reopening rejected rows to pending (e.g. after
-- unchecking Prod Approved on social_media_plans). PostgREST returns success with 0 rows updated.

DROP POLICY IF EXISTS completion_approvals_update ON public.completion_approvals;

CREATE POLICY completion_approvals_update
  ON public.completion_approvals FOR UPDATE
  USING (
    EXISTS (
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
  'Assigner may update their completion_approval rows in any status (pending/approved/rejected), e.g. reopen after prod unapprove or resolve after prod approve.';
