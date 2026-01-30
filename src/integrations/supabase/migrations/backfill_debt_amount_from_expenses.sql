-- Migration: Backfill debt_amount in debts table from expenses
-- Description: Sets debt_amount = total amount used for expense (SUM of expense amounts
--              where expense.withdrawal_from_balance = debt.id). Aligns existing DB
--              values with trigger behavior (debt_amount = total used for expense).
-- Created: 2025-02-01

-- Set debt_amount = total amount used for expense (sum of expense amounts linked to this debt)
UPDATE public.debts d
SET 
    debt_amount = COALESCE(
        (SELECT SUM(e.amount)::NUMERIC(15, 2)
         FROM public.expenses e
         WHERE e.withdrawal_from_balance = d.id),
        0
    ),
    updated_at = NOW();
