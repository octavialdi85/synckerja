-- Migration: Update expense and payment triggers to use recalculate function for Pinjaman Online
-- Description: Expense and payment triggers now call recalculate_pinjaman_online_debt_amount() 
--              to ensure debt_amount and available_limit are always consistent.
-- Created: 2025-02-01

-- This migration updates the triggers created in recalculate_debt_amount_pinjaman_online_on_expense.sql
-- Run recalculate_debt_amount_pinjaman_online_on_expense.sql first, then run this to ensure all triggers are updated

-- Note: The triggers are already updated in recalculate_debt_amount_pinjaman_online_on_expense.sql
-- This file is for reference/documentation

-- After running recalculate_debt_amount_pinjaman_online_on_expense.sql, 
-- all Pinjaman Online debts will have consistent debt_amount and available_limit:
-- - debt_amount = total expense; remaining_debt = debt_amount - paid_amount
-- - available_limit = limit_amount - remaining_debt (satu rumus: expense baru & lunas)

-- To fix existing data, run this query for all Pinjaman Online debts:
-- SELECT public.recalculate_pinjaman_online_debt_amount(id) FROM debts WHERE debt_type = 'Pinjaman Online';
