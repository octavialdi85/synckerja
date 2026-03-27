// Reminder Bills Module
export { ReminderBillsPage } from './ReminderBillsPage';
export { ReminderBillPayNowModal } from './components/ReminderBillPayNowModal';
export {
  AddNewExpenseModal as DesktopAddNewExpenseModal,
  type AddNewExpenseModalProps as DesktopAddNewExpenseModalProps,
  type AddExpensePrefillPayload,
  type AddExpenseAfterSuccessPayload,
  shortExpenseIdForDisplay,
} from './components/DesktopAddNewExpenseModal';
export { buildReminderBillPayNowPrefill } from './utils/reminderBillPayNowPrefill';

// Re-export hooks from dashboard for convenience
export { useExpenses, useExpenseMetrics } from '@/features/4_2_dashboard/hooks';

