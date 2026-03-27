-- Reminder bills (/expenses/reminder-bills) can hide a recurring row without soft-delete (no debt reversal).
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS exclude_from_reminder_bills boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.expenses.exclude_from_reminder_bills IS
  'When true, row is hidden from reminder-bills UI only; status stays active and financial triggers are not run.';

CREATE INDEX IF NOT EXISTS idx_expenses_org_exclude_reminder
  ON public.expenses (organization_id)
  WHERE exclude_from_reminder_bills = true;
