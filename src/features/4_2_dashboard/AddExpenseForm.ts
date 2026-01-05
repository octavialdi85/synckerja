
import { z } from 'zod';

export const addExpenseSchema = z.object({
  expense_name: z.string().min(1, 'Expense name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  expense_type: z.string().min(1, 'Expense type is required'),
  category: z.string().min(1, 'Category is required'),
  department: z.string().optional(),
  create_date: z.string().min(1, 'Create date is required'),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.string().optional(),
  first_payment_date: z.string().optional(),
  description: z.string().optional(),
});

export type AddExpenseFormData = z.infer<typeof addExpenseSchema>;

export const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiannually', label: 'Semi-annually' },
  { value: 'annually', label: 'Annually' },
] as const;
