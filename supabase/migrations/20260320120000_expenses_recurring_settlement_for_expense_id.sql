-- Link recurring settlement payments to the master recurring expense row (no duplicate bill rows).
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_settlement_for_expense_id uuid REFERENCES public.expenses (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_recurring_settlement_for_expense_id
  ON public.expenses (recurring_settlement_for_expense_id)
  WHERE recurring_settlement_for_expense_id IS NOT NULL;
