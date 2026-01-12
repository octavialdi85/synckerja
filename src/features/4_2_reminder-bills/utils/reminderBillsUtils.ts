import { Expense } from '@/features/4_2_dashboard/hooks/useExpenses';
import { ReminderBillsFiltersType } from '../section/ReminderBillsFilters';

export const filterReminderBills = (
  expenses: Expense[],
  filters: ReminderBillsFiltersType
): Expense[] => {
  // First filter only recurring expenses (bills)
  const recurringBills = expenses.filter(expense => expense.is_recurring);
  
  return recurringBills.filter((bill) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        bill.expense_name?.toLowerCase().includes(searchLower) ||
        bill.description?.toLowerCase().includes(searchLower) ||
        bill.category?.toLowerCase().includes(searchLower) ||
        bill.expense_type?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'overdue') {
        if (!bill.next_payment_date) return false;
        const nextDate = new Date(bill.next_payment_date);
        const today = new Date();
        if (nextDate >= today) return false;
      } else if (filters.status === 'active') {
        if (bill.status === 'paid') return false;
        if (bill.next_payment_date) {
          const nextDate = new Date(bill.next_payment_date);
          const today = new Date();
          if (nextDate < today) return false; // Exclude overdue for active
        }
      } else if (bill.status !== filters.status) {
        return false;
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (bill.category?.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // Department filter
    if (filters.department && filters.department !== 'all') {
      if (bill.department?.toLowerCase() !== filters.department.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
};

export const getUniqueBillCategories = (expenses: Expense[]): string[] => {
  const categories = new Set<string>();
  expenses
    .filter(expense => expense.is_recurring)
    .forEach((expense) => {
      if (expense.category) {
        categories.add(expense.category);
      }
    });
  return Array.from(categories).sort();
};

export const getUniqueBillDepartments = (expenses: Expense[]): string[] => {
  const departments = new Set<string>();
  expenses
    .filter(expense => expense.is_recurring)
    .forEach((expense) => {
      if (expense.department) {
        departments.add(expense.department);
      }
    });
  return Array.from(departments).sort();
};
