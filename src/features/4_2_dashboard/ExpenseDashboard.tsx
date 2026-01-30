import { useState, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Card, CardContent } from '@/features/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/features/ui/command';
import { Badge } from '@/features/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/ui/tabs';
import { Plus, Search, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, Receipt, Eye, Trash2, Upload, FilterX, DollarSign } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Checkbox } from '@/features/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useExpenses, CreateExpenseData, useExpenseTypes, useExpenseCategories, Expense, useDebtsForExpense } from './hooks';
import { useBankAccounts } from '@/hooks/organized/useBankAccounts';
import { useBankAccountBalances } from '@/hooks/organized/useBankAccountBalances';
import { addExpenseSchema, AddExpenseFormData, RECURRING_FREQUENCIES } from './AddExpenseForm';
import { useDepartmentsCrud } from '@/features/2-1-employees/MyInfo/Employment/hooks/crudMaster/useDepartmentsCrud';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { DepartmentCrudModal } from './DepartmentCrudModal';
import { ExpenseTypeCrudModal } from './ExpenseTypeCrudModal';
import { ExpenseCategoryCrudModal } from './ExpenseCategoryCrudModal';
import { HeaderAndTab } from './HeaderAndTab';
import { usePurchaseRequests, PurchaseRequest } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { ExpenseTableFooter } from './ExpenseTableFooter';
import { supabase } from '@/integrations/supabase/client';
import { CustomDatePicker } from '@/mobile/components/CustomDatePicker';
import { Link } from 'react-router-dom';

// Helper function to handle invoice file viewing (same as payment-process page)
// Uses createSignedUrl instead of getPublicUrl because the bucket may not be public
const handleViewInvoice = async (filePath: string | null | undefined) => {
  if (!filePath) {
    toast.error('Invoice file path not found');
    return;
  }
  
  // If already a full URL, open directly
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    window.open(filePath, '_blank');
    return;
  }
  
  try {
    // Use purchase-documents bucket (same as PaymentTable.tsx)
    const { data, error } = await supabase.storage
      .from('purchase-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      toast.error('Failed to generate invoice URL. Please try again.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  } catch (error: any) {
    console.error('Error viewing invoice:', error);
    toast.error('Failed to open invoice. Please try again.');
  }
};

export function ExpenseDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [breakdownTab, setBreakdownTab] = useState<'overview' | 'category'>('overview');
  const [dateFilter, setDateFilter] = useState<string>('this-month');
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('all-types');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all-depts');
  const [categoryFilter, setCategoryFilter] = useState<string>('all-categories');
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all-withdrawal');
  const { t } = useAppTranslation();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleRefreshFilters = () => {
    setDateFilter('this-month');
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setExpenseTypeFilter('all-types');
    setDepartmentFilter('all-depts');
    setCategoryFilter('all-categories');
    setCategoryFilterOpen(false);
    setWithdrawalFilter('all-withdrawal');
    setSearchQuery('');
  };

  const { organizationId } = useCurrentOrg();
  const { expenses, isLoading, isCreating, createExpense, deleteExpense } = useExpenses();
  const { data: departments = [], isLoading: departmentsLoading, refetch: refetchDepartments } = useDepartmentsCrud(organizationId);
  const { expenseTypes, isLoading: expenseTypesLoading, refetch: refetchExpenseTypes } = useExpenseTypes();
  const { data: purchaseRequests = [], isLoading: isLoadingPurchaseRequests } = usePurchaseRequests();
  // Fetch all expense categories (without filter) for fallback lookup
  const { expenseCategories: allExpenseCategories } = useExpenseCategories();
  // Fetch debts for withdrawal from balance dropdown
  const { debts: debtsForExpense, isLoading: debtsLoading, refetch: refetchDebts } = useDebtsForExpense();
  // Fetch bank accounts for withdrawal from balance dropdown
  const { bankAccounts, loading: bankAccountsLoading, refetch: refetchBankAccounts } = useBankAccounts();
  const { balances: bankAccountBalances, loading: balancesLoading, refetch: refetchBalances } = useBankAccountBalances();
  
  // Filter purchase requests that are paid/berhasil
  const paidPurchaseRequests = purchaseRequests.filter(req => 
    req.status === 'approved' && 
    (req.paid_at || req.payment_status === 'paid')
  );
  
  // Helper function to get expense type name
  const getExpenseTypeName = (pr: PurchaseRequest): string => {
    // First try to get from joined expense_types (this is the most reliable)
    if (pr.expense_types?.name) {
      return pr.expense_types.name;
    }
    
    // If join failed but expense_type_id exists, try to find in expenseTypes array
    // This is a fallback in case the join query doesn't work properly
    if (pr.expense_type_id && expenseTypes.length > 0) {
      const expenseType = expenseTypes.find(et => et.id === pr.expense_type_id);
      if (expenseType) {
        console.log('Found expense type from expenseTypes array:', expenseType.name);
        return expenseType.name;
      } else {
        console.warn('Expense type ID exists but not found in expenseTypes array:', {
          expense_type_id: pr.expense_type_id,
          available_types: expenseTypes.map(et => ({ id: et.id, name: et.name }))
        });
      }
    }
    
    // Log warning if expense_type_id is missing
    if (!pr.expense_type_id) {
      console.warn('Purchase request missing expense_type_id:', {
        id: pr.id,
        request_title: pr.request_title,
        expense_types: pr.expense_types
      });
    }
    
    // Fallback to 'Uncategorized'
    return 'Uncategorized';
  };
  
  // Helper function to get expense category name
  const getExpenseCategoryName = (pr: PurchaseRequest): string => {
    // First try to get from joined expense_categories (this is the most reliable)
    if (pr.expense_categories?.name) {
      return pr.expense_categories.name;
    }
    
    // If join failed but expense_category_id exists, try to find in allExpenseCategories array
    if (pr.expense_category_id && allExpenseCategories.length > 0) {
      const expenseCategory = allExpenseCategories.find(ec => ec.id === pr.expense_category_id);
      if (expenseCategory) {
        console.log('Found expense category from allExpenseCategories array:', expenseCategory.name);
        return expenseCategory.name;
      } else {
        console.warn('Expense category ID exists but not found in allExpenseCategories array:', {
          expense_category_id: pr.expense_category_id,
          available_categories: allExpenseCategories.map(ec => ({ id: ec.id, name: ec.name }))
        });
      }
    }
    
    // Log warning if expense_category_id is missing
    if (!pr.expense_category_id) {
      console.warn('Purchase request missing expense_category_id:', {
        id: pr.id,
        request_title: pr.request_title,
        expense_categories: pr.expense_categories,
        expense_type_id: pr.expense_type_id
      });
    }
    
    // Fallback to request_type or 'Purchase'
    return pr.request_type || 'Purchase';
  };
  
  // Get date range based on filter selection
  const getDateRange = useMemo(() => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case 'this-week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'this-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case '3-months-ago':
        const threeMonthsAgo = subMonths(now, 3);
        return {
          start: startOfMonth(threeMonthsAgo),
          end: endOfMonth(threeMonthsAgo)
        };
      case '6-months-ago':
        const sixMonthsAgo = subMonths(now, 6);
        return {
          start: startOfMonth(sixMonthsAgo),
          end: endOfMonth(sixMonthsAgo)
        };
      case 'this-year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      case 'last-year':
        const lastYear = subYears(now, 1);
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(customStartDate),
            end: endOfDay(customEndDate)
          };
        }
        return null;
      case 'all-dates':
      default:
        return null; // No filter, show all
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Helper function to calculate next payment date for recurring expenses
  const calculateNextPaymentDate = (
    lastPaymentDate: string,
    recurringFrequency: string | undefined | null
  ): string | undefined => {
    if (!recurringFrequency) return undefined;
    
    // Normalize frequency to lowercase for case-insensitive comparison
    const normalizedFrequency = recurringFrequency.toLowerCase().trim();
    
    const lastPayment = new Date(lastPaymentDate);
    const nextPayment = new Date(lastPayment);
    
    switch (normalizedFrequency) {
      case 'daily':
        nextPayment.setDate(nextPayment.getDate() + 1);
        break;
      case 'weekly':
        nextPayment.setDate(nextPayment.getDate() + 7);
        break;
      case 'biweekly':
      case 'bi-weekly':
        nextPayment.setDate(nextPayment.getDate() + 14);
        break;
      case 'monthly':
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
      case 'quarterly':
        nextPayment.setMonth(nextPayment.getMonth() + 3);
        break;
      case 'semiannually':
      case 'semi-annually':
        nextPayment.setMonth(nextPayment.getMonth() + 6);
        break;
      case 'annually':
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        break;
      default:
        console.warn('Unknown recurring frequency:', recurringFrequency);
        return undefined;
    }
    
    return nextPayment.toISOString().split('T')[0];
  };
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepartmentCrudOpen, setIsDepartmentCrudOpen] = useState(false);
  const [isExpenseTypeCrudOpen, setIsExpenseTypeCrudOpen] = useState(false);
  const [isExpenseCategoryCrudOpen, setIsExpenseCategoryCrudOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date>();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<string>('');
  const [amountDisplay, setAmountDisplay] = useState<string>('');
  const [isCreateDatePickerOpen, setIsCreateDatePickerOpen] = useState(false);
  const [isFirstPaymentDatePickerOpen, setIsFirstPaymentDatePickerOpen] = useState(false);
  const { expenseCategories, refetch: refetchExpenseCategories } = useExpenseCategories(selectedExpenseTypeId);

  const form = useForm<AddExpenseFormData>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      expense_name: '',
      amount: undefined as any,
      expense_type: '',
      category: '',
      department: '',
      withdrawal_from_balance: undefined,
      bank_account_id: undefined,
      create_date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      recurring_frequency: '',
      first_payment_date: '',
      description: '',
    },
  });

  const isRecurring = form.watch('is_recurring');

  const handleSubmit = async (data: AddExpenseFormData) => {
    // Validate available_limit if withdrawal_from_balance is selected
    if (data.withdrawal_from_balance && data.withdrawal_from_balance !== 'none') {
      const selectedDebt = debtsForExpense.find(d => d.id === data.withdrawal_from_balance);
      if (selectedDebt) {
        // Hook sudah menghitung available_limit dengan benar (termasuk fallback untuk Pinjaman Online)
        const availableLimit = selectedDebt.available_limit ?? 0;
        if (availableLimit < data.amount) {
          toast.error(`Insufficient available limit. Available: Rp ${availableLimit.toLocaleString('id-ID')}, Required: Rp ${data.amount.toLocaleString('id-ID')}`);
          return;
        }
      }
    }
    
    // Validate bank account balance if bank_account_id is selected
    if (data.bank_account_id) {
      const balance = bankAccountBalances.find(b => b.bank_account_id === data.bank_account_id);
      const availableBalance = balance?.balance ?? 0;
      if (availableBalance < data.amount) {
        toast.error(`Insufficient balance. Available: Rp ${availableBalance.toLocaleString('id-ID')}, Required: Rp ${data.amount.toLocaleString('id-ID')}`);
        return;
      }
    }

    // Find the selected expense type to get its ID
    const selectedExpenseType = expenseTypes.find(type => type.name === data.expense_type);
    
    const expenseData: CreateExpenseData = {
      expense_name: data.expense_name || '',
      amount: data.amount || 0,
      expense_type: data.expense_type || '',
      category: data.category || '',
      department: data.department,
      create_date: data.create_date || format(new Date(), 'yyyy-MM-dd'),
      is_recurring: data.is_recurring || false,
      recurring_frequency: data.recurring_frequency,
      first_payment_date: data.first_payment_date,
      description: data.description,
      receipt_file: receiptFile || undefined,
      withdrawal_from_balance: data.withdrawal_from_balance && data.withdrawal_from_balance !== 'none' 
        ? data.withdrawal_from_balance 
        : undefined,
      bank_account_id: data.bank_account_id || undefined,
    };

    const success = await createExpense(expenseData);
    if (success) {
      // Refresh bank account balances after expense creation
      refetchBalances();
      setIsAddModalOpen(false);
      form.reset({
        expense_name: '',
        amount: undefined as any,
        expense_type: '',
        category: '',
        department: '',
        withdrawal_from_balance: undefined,
        bank_account_id: undefined,
        create_date: format(new Date(), 'yyyy-MM-dd'),
        is_recurring: false,
        recurring_frequency: '',
        first_payment_date: '',
        description: '',
      });
      setAmountDisplay('');
      setReceiptFile(null);
      setSelectedDate(undefined);
      setFirstPaymentDate(undefined);
      setIsCreateDatePickerOpen(false);
      setIsFirstPaymentDatePickerOpen(false);
      form.setValue('withdrawal_from_balance', undefined);
      // Refresh debts to update available_limit
      if (expenseData.withdrawal_from_balance) {
        refetchDebts();
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, WEBP, and PDF files are allowed');
        return;
      }
      
      setReceiptFile(file);
      toast.success('Receipt file selected');
    }
  };

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (expenseToDelete) {
      // Check if expense has withdrawal_from_balance before deleting
      const expenseToDeleteObj = allExpenses.find(e => e.id === expenseToDelete);
      const hasWithdrawalFromBalance = expenseToDeleteObj?.withdrawal_from_balance;
      
      const success = await deleteExpense(expenseToDelete);
      if (success) {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
        // Refresh debts to update available_limit
        if (hasWithdrawalFromBalance) {
          refetchDebts();
        }
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Format amount with thousands separator (dot)
  const formatAmount = (value: string): string => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    if (!numericValue) return '';
    
    // Format with thousand separator (.)
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse formatted amount back to number
  const parseAmount = (value: string): number => {
    // Remove all non-numeric characters (including thousand separators)
    const numericValue = parseFloat(value.replace(/\D/g, '')) || 0;
    return numericValue;
  };

  // Combine expenses with paid purchase requests for display
  const allExpenses = useMemo(() => {
    // Map regular expenses to include request_title and requester_name fields
    // Also recalculate next_payment_date for recurring expenses if missing or expired
    const mappedExpenses = expenses.map(expense => {
      let nextPaymentDate = expense.next_payment_date;
      
      // If expense is recurring but next_payment_date is missing or expired, recalculate it
      if (expense.is_recurring && expense.recurring_frequency) {
        if (!nextPaymentDate) {
          // Calculate from create_date if next_payment_date is missing
          nextPaymentDate = calculateNextPaymentDate(expense.create_date, expense.recurring_frequency);
        } else {
          // Check if next_payment_date has passed, if so, calculate next one
          const nextPayment = new Date(nextPaymentDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (nextPayment < today) {
            // Calculate next payment date from the last next_payment_date
            nextPaymentDate = calculateNextPaymentDate(nextPaymentDate, expense.recurring_frequency);
          }
        }
      }
      
      return {
        ...expense,
        request_title: expense.expense_name, // For regular expenses, use expense_name as request_title
        requester_name: undefined, // Regular expenses don't have requester_name
        next_payment_date: nextPaymentDate || expense.next_payment_date,
      };
    });
    
    const combined = [...mappedExpenses];
    
    // Add paid purchase requests as expenses
    paidPurchaseRequests.forEach(pr => {
      // Get expense type name - this should be the actual name from expense_types table
      // like "Operating Expenses", "Fixed Expenses", "Variable Expenses", etc.
      const expenseTypeName = getExpenseTypeName(pr);
      
      // Get expense category name - this should be the actual name from expense_categories table
      const expenseCategoryName = getExpenseCategoryName(pr);
      
      // Calculate next payment date for recurring purchase requests
      const lastPaymentDate = pr.paid_at || pr.approved_at || pr.created_at;
      const nextPaymentDate = pr.is_recurring && pr.recurring_frequency
        ? calculateNextPaymentDate(lastPaymentDate, pr.recurring_frequency)
        : undefined;
      
      combined.push({
        id: pr.id,
        organization_id: pr.organization_id,
        expense_name: pr.request_title,
        amount: pr.amount_idr,
        // Use expense type name from expense_types table
        expense_type: expenseTypeName,
        expense_type_id: pr.expense_type_id || undefined,
        // Use expense category name from expense_categories table
        category: expenseCategoryName,
        expense_category_id: pr.expense_category_id || undefined,
        department: pr.department_name || undefined,
        create_date: lastPaymentDate,
        is_recurring: pr.is_recurring || false,
        recurring_frequency: pr.recurring_frequency || undefined,
        first_payment_date: undefined,
        next_payment_date: nextPaymentDate,
        description: pr.description,
        receipt_url: pr.invoice_file_path || undefined,
        status: 'active',
        created_by: pr.created_by,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        // Add purchase request specific fields
        request_title: pr.request_title,
        requester_name: pr.requester_name,
      } as Expense & { request_title?: string; requester_name?: string });
    });
    
    // Sort by date (newest first)
    const sorted = combined.sort((a, b) => {
      const dateA = new Date(a.create_date).getTime();
      const dateB = new Date(b.create_date).getTime();
      return dateB - dateA;
    });

    // Apply date filter if selected
    let filtered = sorted;
    if (getDateRange) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.create_date);
        const expenseTimestamp = expenseDate.getTime();
        const startTimestamp = getDateRange.start.getTime();
        const endTimestamp = getDateRange.end.getTime();
        return expenseTimestamp >= startTimestamp && expenseTimestamp <= endTimestamp;
      });
    }

    // Apply expense type filter if selected
    if (expenseTypeFilter && expenseTypeFilter !== 'all-types') {
      filtered = filtered.filter(expense => {
        return expense.expense_type === expenseTypeFilter;
      });
    }

    // Apply department filter if selected
    if (departmentFilter && departmentFilter !== 'all-depts') {
      filtered = filtered.filter(expense => {
        return expense.department === departmentFilter;
      });
    }

    // Apply expense category filter if selected
    if (categoryFilter && categoryFilter !== 'all-categories') {
      filtered = filtered.filter(expense => {
        return expense.expense_category_id === categoryFilter;
      });
    }

    // Apply withdrawal from balance filter if selected
    if (withdrawalFilter && withdrawalFilter !== 'all-withdrawal') {
      if (withdrawalFilter === 'none') {
        filtered = filtered.filter(expense => !expense.withdrawal_from_balance && !expense.bank_account_id);
      } else if (withdrawalFilter.startsWith('debt_')) {
        const debtId = withdrawalFilter.replace('debt_', '');
        filtered = filtered.filter(expense => expense.withdrawal_from_balance === debtId);
      } else if (withdrawalFilter.startsWith('bank_')) {
        const bankId = withdrawalFilter.replace('bank_', '');
        filtered = filtered.filter(expense => expense.bank_account_id === bankId);
      }
    }

    return filtered;
  }, [expenses, paidPurchaseRequests, getDateRange, expenseTypeFilter, departmentFilter, categoryFilter, withdrawalFilter]);

  // Data untuk tab "Expense Category" saja: filter date/type/dept, TANPA filter kategori.
  // Tab Expense Category tidak merespon filter kategori agar breakdown per kategori tetap tampil penuh.
  const allExpensesForCategoryBreakdown = useMemo(() => {
    const mappedExpenses = expenses.map(expense => {
      let nextPaymentDate = expense.next_payment_date;
      if (expense.is_recurring && expense.recurring_frequency) {
        if (!nextPaymentDate) {
          nextPaymentDate = calculateNextPaymentDate(expense.create_date, expense.recurring_frequency);
        } else {
          const nextPayment = new Date(nextPaymentDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (nextPayment < today) {
            nextPaymentDate = calculateNextPaymentDate(nextPaymentDate, expense.recurring_frequency);
          }
        }
      }
      return {
        ...expense,
        request_title: expense.expense_name,
        requester_name: undefined,
        next_payment_date: nextPaymentDate || expense.next_payment_date,
      };
    });
    const combined = [...mappedExpenses];
    paidPurchaseRequests.forEach(pr => {
      const expenseTypeName = getExpenseTypeName(pr);
      const expenseCategoryName = getExpenseCategoryName(pr);
      const lastPaymentDate = pr.paid_at || pr.approved_at || pr.created_at;
      const nextPaymentDate = pr.is_recurring && pr.recurring_frequency
        ? calculateNextPaymentDate(lastPaymentDate, pr.recurring_frequency)
        : undefined;
      combined.push({
        id: pr.id,
        organization_id: pr.organization_id,
        expense_name: pr.request_title,
        amount: pr.amount_idr,
        expense_type: expenseTypeName,
        expense_type_id: pr.expense_type_id || undefined,
        category: expenseCategoryName,
        expense_category_id: pr.expense_category_id || undefined,
        department: pr.department_name || undefined,
        create_date: lastPaymentDate,
        is_recurring: pr.is_recurring || false,
        recurring_frequency: pr.recurring_frequency || undefined,
        first_payment_date: undefined,
        next_payment_date: nextPaymentDate,
        description: pr.description,
        receipt_url: pr.invoice_file_path || undefined,
        status: 'active',
        created_by: pr.created_by,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        request_title: pr.request_title,
        requester_name: pr.requester_name,
      } as Expense & { request_title?: string; requester_name?: string });
    });
    const sorted = combined.sort((a, b) => {
      const dateA = new Date(a.create_date).getTime();
      const dateB = new Date(b.create_date).getTime();
      return dateB - dateA;
    });
    let filtered = sorted;
    if (getDateRange) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.create_date);
        const expenseTimestamp = expenseDate.getTime();
        const startTimestamp = getDateRange.start.getTime();
        const endTimestamp = getDateRange.end.getTime();
        return expenseTimestamp >= startTimestamp && expenseTimestamp <= endTimestamp;
      });
    }
    if (expenseTypeFilter && expenseTypeFilter !== 'all-types') {
      filtered = filtered.filter(expense => expense.expense_type === expenseTypeFilter);
    }
    if (departmentFilter && departmentFilter !== 'all-depts') {
      filtered = filtered.filter(expense => expense.department === departmentFilter);
    }
    // Apply withdrawal from balance filter so all sections respond
    if (withdrawalFilter && withdrawalFilter !== 'all-withdrawal') {
      if (withdrawalFilter === 'none') {
        filtered = filtered.filter(expense => !expense.withdrawal_from_balance && !expense.bank_account_id);
      } else if (withdrawalFilter.startsWith('debt_')) {
        const debtId = withdrawalFilter.replace('debt_', '');
        filtered = filtered.filter(expense => expense.withdrawal_from_balance === debtId);
      } else if (withdrawalFilter.startsWith('bank_')) {
        const bankId = withdrawalFilter.replace('bank_', '');
        filtered = filtered.filter(expense => expense.bank_account_id === bankId);
      }
    }
    // Sengaja TIDAK menerapkan categoryFilter agar tab Expense Category selalu menampilkan breakdown semua kategori
    return filtered;
  }, [expenses, paidPurchaseRequests, getDateRange, expenseTypeFilter, departmentFilter, withdrawalFilter]);

  const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentMonthTotal = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.create_date);
      const currentDate = new Date();
      return expenseDate.getMonth() === currentDate.getMonth() && 
             expenseDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate monthly data for chart
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Initialize all months with 0
    const monthlyTotals = months.map(month => ({
      month,
      amount: 0
    }));

    // Calculate totals for each month
    allExpenses.forEach(expense => {
      const expenseDate = new Date(expense.create_date);
      if (expenseDate.getFullYear() === currentYear) {
        const monthIndex = expenseDate.getMonth();
        monthlyTotals[monthIndex].amount += expense.amount;
      }
    });

    return monthlyTotals;
  }, [allExpenses]);

    const handleExpenseTypeChange = (value: string) => {
      form.setValue('expense_type', value);
      setSelectedExpenseTypeId(expenseTypes.find(type => type.name === value)?.id || '');
      // Reset category when expense type changes
      form.setValue('category', '');
    };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-4 min-w-0">
          <div className="h-full flex flex-col overflow-hidden min-w-0">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1 min-w-0">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>
            
            {/* Content Area - max-h + flex; table section scrolls internally */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] min-w-0">
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-2 bg-gradient-to-br from-gray-50 to-white min-w-0">
              {/* Quick View Total Current Balance - not affected by table filters; updates instantly when expense uses bank balance */}
      <Card className="mb-4 bg-blue-600 text-white border-0 w-full min-w-0 flex-shrink-0">
        <CardContent className="p-3 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-100 truncate">{t('expenses.quickViewTotalBalance', 'Quick View Total Current Balance')}</span>
              </div>
              <Link
                to="/incomes/dashboard"
                className="inline-block flex-shrink-0"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-medium whitespace-nowrap"
                >
                  {t('expenses.goToIncomeDashboard', 'Lihat Income')}
                </Button>
              </Link>
            </div>
            <div className="text-left sm:text-right min-w-0 flex-shrink-0">
              <div className="text-2xl sm:text-3xl font-bold text-white truncate">
                {balancesLoading ? (t('expenses.loading', 'Loading...')) : formatCurrency(
                  bankAccountBalances.reduce((total, b) => total + (b.balance ?? 0), 0)
                )}
              </div>
              <div className="text-xs text-blue-100 truncate mt-1">
                {bankAccounts.length} bank account{bankAccounts.length !== 1 ? 's' : ''} registered
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 min-w-0 flex-shrink-0">
        <Card className="min-w-0">
        <CardContent className="p-3 min-w-0">
            <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Current Month Total</div>
            <div className="text-xl sm:text-2xl font-bold mb-1 truncate">{formatCurrency(currentMonthTotal)}</div>
            <div className="text-xs text-gray-500 truncate">vs. last month</div>
            <div className="text-xs text-green-600 mt-1 truncate">↑ {currentMonthTotal > 0 ? '100' : '0'}%</div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
        <CardContent className="p-3 min-w-0">
            <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Expenses YTD</div>
            <div className="text-xl sm:text-2xl font-bold mb-1 truncate">{formatCurrency(totalExpenses)}</div>
            <div className="text-xs text-gray-500 truncate">{expenses.length} transactions</div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 flex-shrink-0"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
        <CardContent className="p-3 min-w-0">
            <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Highest Expense</div>
            <div className="text-xl sm:text-2xl font-bold mb-1 truncate">
              {allExpenses.length > 0 ? formatCurrency(Math.max(...allExpenses.map(e => e.amount))) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500 truncate" title={allExpenses.length > 0 ? allExpenses.find(e => e.amount === Math.max(...allExpenses.map(ex => ex.amount)))?.expense_name : 'No expenses yet'}>
              {allExpenses.length > 0 ? allExpenses.find(e => e.amount === Math.max(...allExpenses.map(ex => ex.amount)))?.expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1 min-w-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 flex-shrink-0"></div>
              <span className="text-xs text-gray-500 truncate">
                {allExpenses.length > 0 ? format(new Date(allExpenses[0].create_date), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 min-w-0">
            <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Latest Transaction</div>
            <div className="text-xl sm:text-2xl font-bold mb-1 truncate">
              {allExpenses.length > 0 ? formatCurrency(allExpenses[0].amount) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500 truncate" title={allExpenses.length > 0 ? allExpenses[0].expense_name : 'No expenses yet'}>
              {allExpenses.length > 0 ? allExpenses[0].expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1 min-w-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
              <span className="text-xs text-gray-500 truncate">
                {allExpenses.length > 0 ? format(new Date(allExpenses[0].created_at), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2 min-w-0 flex-shrink-0">
        <Card className="flex flex-col min-w-0">
        <CardContent className="pt-3 px-3 pb-2 flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-4 gap-2 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold truncate">Expense Breakdown</h3>
              <div className="text-right min-w-0">
                <div className="text-base sm:text-lg font-semibold truncate">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>

            <Tabs value={breakdownTab} onValueChange={(value) => setBreakdownTab(value as 'overview' | 'category')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="category" className="text-xs sm:text-sm">Expense Category</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0">
                {allExpenses.length > 0 ? (
                  <>
                    <div className="flex items-end justify-center gap-1 pt-2 px-2 pb-0 min-w-0">
                      {(() => {
                        // Calculate expense type totals (by expense_type, not category)
                        const expenseTypeTotals = allExpenses.reduce((acc, expense) => {
                          const expenseType = expense.expense_type || 'Uncategorized';
                          acc[expenseType] = (acc[expenseType] || 0) + expense.amount;
                          return acc;
                        }, {} as Record<string, number>);

                        const maxAmount = Math.max(...Object.values(expenseTypeTotals));
                        const colors = ['bg-green-500', 'bg-green-400', 'bg-blue-500', 'bg-blue-400', 'bg-purple-500', 'bg-purple-400', 'bg-orange-500', 'bg-orange-400'];
                        
                        return Object.entries(expenseTypeTotals).map(([expenseType, amount], index) => {
                          const heightPercentage = maxAmount > 0 ? (amount / maxAmount) * 80 : 0;
                          const colorClass = colors[index % colors.length];
                          
                          return (
                            <div key={expenseType} className="flex-1 flex flex-col items-center min-w-0 gap-0.5 pb-0">
                              <div className="w-full bg-gray-100 rounded flex flex-col justify-end h-48 p-1">
                                <div
                                  className={`w-full ${colorClass} rounded-t min-h-[4px]`}
                                  style={{ height: `${Math.max(heightPercentage, 8)}%` }}
                                  title={`${expenseType}: ${formatCurrency(amount)}`}
                                />
                              </div>
                              <span className="text-xs text-gray-600 text-center whitespace-nowrap truncate w-full mb-0" title={expenseType}>
                                {expenseType}
                              </span>
                              <span className="text-xs font-medium text-gray-800 text-center truncate w-full mb-0" title={formatCurrency(amount)}>
                                {formatCurrency(amount)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 h-32 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No expense data available</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="category" className="mt-0">
                {allExpensesForCategoryBreakdown.length > 0 ? (
                  <>
                    <div className="flex items-end justify-center gap-1 pt-2 px-2 pb-0 min-w-0">
                      {(() => {
                        // Tab Expense Category tidak ikut filter kategori: pakai allExpensesForCategoryBreakdown
                        const categoryTotals = allExpensesForCategoryBreakdown.reduce((acc, expense) => {
                          const category = expense.category || 'Uncategorized';
                          acc[category] = (acc[category] || 0) + expense.amount;
                          return acc;
                        }, {} as Record<string, number>);

                        const maxAmount = Math.max(...Object.values(categoryTotals));
                        const colors = ['bg-green-500', 'bg-green-400', 'bg-blue-500', 'bg-blue-400', 'bg-purple-500', 'bg-purple-400', 'bg-orange-500', 'bg-orange-400'];
                        
                        return Object.entries(categoryTotals).map(([category, amount], index) => {
                          const heightPercentage = maxAmount > 0 ? (amount / maxAmount) * 80 : 0;
                          const colorClass = colors[index % colors.length];
                          
                          return (
                            <div key={category} className="flex-1 flex flex-col items-center min-w-0 gap-0.5 pb-0">
                              <div className="w-full bg-gray-100 rounded flex flex-col justify-end h-48 p-1">
                                <div
                                  className={`w-full ${colorClass} rounded-t min-h-[4px]`}
                                  style={{ height: `${Math.max(heightPercentage, 8)}%` }}
                                  title={`${category}: ${formatCurrency(amount)}`}
                                />
                              </div>
                              <span className="text-xs text-gray-600 text-center whitespace-nowrap truncate w-full mb-0" title={category}>
                                {category}
                              </span>
                              <span className="text-xs font-medium text-gray-800 text-center truncate w-full mb-0" title={formatCurrency(amount)}>
                                {formatCurrency(amount)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 h-32 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No expense data available</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-w-0">
          <CardContent className="pt-3 px-3 pb-1 flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0 min-w-0 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold truncate">Monthly Comparison</h3>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Expense trends throughout the year</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            <div className="flex-1 min-h-0 min-w-0">
              {monthlyData.length > 0 && monthlyData.some(d => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height="100%" className="min-w-0">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={10}
                      stroke="#6b7280"
                      tickLine={false}
                    />
                    <YAxis 
                      fontSize={10}
                      stroke="#6b7280"
                      tickLine={false}
                      width={58}
                      tick={{ style: { whiteSpace: 'nowrap' } }}
                      tickFormatter={(value) => {
                        const nbsp = '\u00A0';
                        if (value >= 1000000) return `Rp${nbsp}${(value / 1000000).toFixed(1)}jt`;
                        if (value >= 1000) return `Rp${nbsp}${(value / 1000).toFixed(0)}rb`;
                        return `Rp${nbsp}${value.toLocaleString('id-ID')}`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Expenses']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-sm">No expense data available for this year</span>
                </div>
              )}
            </div>

            <div className="flex items-center mt-1 flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Table Section - scrolls internally via seamless-scroll */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-w-0 flex-1 min-h-0">
        {/* Table Header with Search and Filters */}
        <div className="px-2 sm:px-3 py-2 border-b bg-gray-50 flex-shrink-0 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 min-w-0">
            <div className="flex items-center flex-wrap gap-2 min-w-0 flex-1">
              <div className="relative min-w-0 flex-1 sm:flex-initial">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-10 w-full sm:w-48 md:w-64 min-w-0"
                />
              </div>
              
              <Select 
                value={dateFilter} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setIsCustomDatePickerOpen(true);
                  } else {
                    setDateFilter(value);
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-36 md:w-40 min-w-0">
                  <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <SelectValue placeholder={t('expenses.dateFilter.allDates', 'All Dates')}>
                    {dateFilter === 'custom' && customStartDate && customEndDate
                      ? `${format(customStartDate, 'MMM dd')} - ${format(customEndDate, 'MMM dd')}`
                      : dateFilter === 'all-dates'
                      ? t('expenses.dateFilter.allDates', 'All Dates')
                      : dateFilter === 'today'
                      ? t('expenses.dateFilter.today', 'Today')
                      : dateFilter === 'yesterday'
                      ? t('expenses.dateFilter.yesterday', 'Yesterday')
                      : dateFilter === 'this-week'
                      ? t('expenses.dateFilter.thisWeek', 'This Week')
                      : dateFilter === 'this-month'
                      ? t('expenses.dateFilter.thisMonth', 'This Month')
                      : dateFilter === 'last-month'
                      ? t('expenses.dateFilter.lastMonth', 'Last Month')
                      : dateFilter === '3-months-ago'
                      ? t('expenses.dateFilter.3MonthsAgo', '3 Months Ago')
                      : dateFilter === '6-months-ago'
                      ? t('expenses.dateFilter.6MonthsAgo', '6 Months Ago')
                      : dateFilter === 'this-year'
                      ? t('expenses.dateFilter.thisYear', 'This Year')
                      : dateFilter === 'last-year'
                      ? t('expenses.dateFilter.lastYear', 'Last Year')
                      : t('expenses.dateFilter.allDates', 'All Dates')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-dates">{t('expenses.dateFilter.allDates', 'All Dates')}</SelectItem>
                  <SelectItem value="today">{t('expenses.dateFilter.today', 'Today')}</SelectItem>
                  <SelectItem value="yesterday">{t('expenses.dateFilter.yesterday', 'Yesterday')}</SelectItem>
                  <SelectItem value="this-week">{t('expenses.dateFilter.thisWeek', 'This Week')}</SelectItem>
                  <SelectItem value="this-month">{t('expenses.dateFilter.thisMonth', 'This Month')}</SelectItem>
                  <SelectItem value="last-month">{t('expenses.dateFilter.lastMonth', 'Last Month')}</SelectItem>
                  <SelectItem value="3-months-ago">{t('expenses.dateFilter.3MonthsAgo', '3 Months Ago')}</SelectItem>
                  <SelectItem value="6-months-ago">{t('expenses.dateFilter.6MonthsAgo', '6 Months Ago')}</SelectItem>
                  <SelectItem value="this-year">{t('expenses.dateFilter.thisYear', 'This Year')}</SelectItem>
                  <SelectItem value="last-year">{t('expenses.dateFilter.lastYear', 'Last Year')}</SelectItem>
                  <SelectItem value="custom">{t('expenses.dateFilter.customRange', 'Custom Range')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter}>
                <SelectTrigger className="w-full sm:w-36 md:w-40 min-w-0">
                  <SelectValue placeholder={t('expenses.expenseTypeFilter.allTypes', 'All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">{t('expenses.expenseTypeFilter.allTypes', 'All Types')}</SelectItem>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryFilterOpen}
                    className="w-full sm:w-36 md:w-40 min-w-0 justify-between font-normal"
                  >
                    <span className="truncate">
                      {categoryFilter === 'all-categories'
                        ? t('expenses.categoryFilter.allCategories', 'All Categories')
                        : allExpenseCategories.find((c) => c.id === categoryFilter)?.name ?? t('expenses.categoryFilter.allCategories', 'All Categories')}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t('expenses.categoryFilter.searchPlaceholder', 'Cari kategori...')}
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>{t('expenses.categoryFilter.noResults', 'Tidak ada kategori.')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value={t('expenses.categoryFilter.allCategories', 'All Categories')}
                          onSelect={() => {
                            setCategoryFilter('all-categories');
                            setCategoryFilterOpen(false);
                          }}
                        >
                          {t('expenses.categoryFilter.allCategories', 'All Categories')}
                        </CommandItem>
                        {allExpenseCategories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => {
                              setCategoryFilter(cat.id);
                              setCategoryFilterOpen(false);
                            }}
                          >
                            {cat.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter} disabled={debtsLoading || bankAccountsLoading}>
                <SelectTrigger className="w-full sm:w-40 md:w-44 min-w-0">
                  <SelectValue placeholder={debtsLoading || bankAccountsLoading ? t('expenses.withdrawalFilter.loading', 'Loading...') : t('expenses.withdrawalFilter.allWithdrawal', 'Withdrawal From Balance')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-withdrawal">{t('expenses.withdrawalFilter.allWithdrawal', 'All')}</SelectItem>
                  <SelectItem value="none">{t('expenses.withdrawalFilter.none', 'None')}</SelectItem>
                  {debtsForExpense.length > 0 && (
                    <>
                      {debtsForExpense.map((debt) => (
                        <SelectItem key={debt.id} value={`debt_${debt.id}`}>
                          {debt.debt_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {bankAccounts.length > 0 && (
                    <>
                      {bankAccounts.map((bank) => (
                        <SelectItem key={bank.id} value={`bank_${bank.id}`}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={departmentsLoading}>
                <SelectTrigger className="w-full sm:w-36 md:w-40 min-w-0">
                  <SelectValue placeholder={departmentsLoading ? t('expenses.departmentFilter.loading', 'Loading...') : t('expenses.departmentFilter.allDepts', 'All Depts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-depts">{t('expenses.departmentFilter.allDepts', 'All Depts')}</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefreshFilters}
                className="h-9 w-9 shrink-0 rounded-md border-gray-300 bg-white"
                title={t('expenses.refreshFilters', 'Reset filters to default')}
              >
                <FilterX className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Table - seamless vertical scroll when many rows */}
        <div className="flex-1 min-h-0 min-w-0 seamless-scroll overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1400px]">
              <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Expense</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Payment Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Next Payment</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Type</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Category</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Department</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Amount</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Withdrawal From Balance</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Description</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Request By</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Recurring</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Status</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(isLoading || isLoadingPurchaseRequests) ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-gray-500">
                      Loading expenses...
                    </td>
                  </tr>
                ) : allExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-gray-500">
                      No expenses found. Click "Add Expense" to create your first expense.
                    </td>
                  </tr>
                ) : (
                  allExpenses
                    .filter(expense => 
                      expense.expense_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      expense.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((expense) => {
                      // Check if this is a paid purchase request
                      const isPaidPurchaseRequest = paidPurchaseRequests.some(pr => pr.id === expense.id);
                      // Get requester name - from expense object if available, otherwise from purchase request
                      const requesterName = (expense as any).requester_name || 
                        (isPaidPurchaseRequest 
                          ? paidPurchaseRequests.find(pr => pr.id === expense.id)?.requester_name 
                          : undefined);
                      // Get request title - from expense object if available, otherwise from purchase request or expense_name
                      const requestTitle = (expense as any).request_title || 
                        (isPaidPurchaseRequest 
                          ? paidPurchaseRequests.find(pr => pr.id === expense.id)?.request_title 
                          : expense.expense_name);
                      return (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[150px] sm:max-w-[200px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={requestTitle || expense.expense_name || '-'}>
                            {requestTitle || expense.expense_name || '-'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm">{format(new Date(expense.create_date), 'dd MMM yyyy')}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm">{expense.next_payment_date ? format(new Date(expense.next_payment_date), 'dd MMM yyyy') : '-'}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[200px] sm:max-w-[250px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={expense.expense_type}>
                            {expense.expense_type}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[200px] sm:max-w-[250px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={expense.category}>
                            {expense.category}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[150px] sm:max-w-[200px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={expense.department || 'N/A'}>
                            {expense.department || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium whitespace-nowrap text-xs sm:text-sm">{formatCurrency(expense.amount)}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[150px] sm:max-w-[200px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={
                            (expense as any).withdrawal_from_balance_bank_account?.name 
                              || (expense as any).withdrawal_from_balance_debt?.debt_name 
                              || '-'
                          }>
                            {(expense as any).withdrawal_from_balance_bank_account?.name 
                              || (expense as any).withdrawal_from_balance_debt?.debt_name 
                              || '-'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[200px] sm:max-w-[250px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={expense.description || '-'}>
                            {expense.description || '-'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[120px] sm:max-w-[150px] min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={requesterName || '-'}>
                            {requesterName || '-'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                          <Badge variant={expense.is_recurring ? 'default' : 'secondary'} className="text-xs">
                            {expense.is_recurring ? 'Recurring' : 'One-time'}
                          </Badge>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                          <Badge variant={isPaidPurchaseRequest ? 'default' : 'secondary'} className="text-xs">
                            {isPaidPurchaseRequest ? 'Berhasil' : (expense.is_recurring ? 'Recurring' : 'One-time')}
                          </Badge>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {expense.receipt_url && (
                                <DropdownMenuItem onClick={() => handleViewInvoice(expense.receipt_url)}>
                                  <Receipt className="h-4 w-4 mr-2 text-gray-600" />
                                  {isPaidPurchaseRequest ? 'View Invoice' : 'View Receipt'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleViewDetails(expense)}>
                                <Eye className="h-4 w-4 mr-2 text-gray-600" />
                                Details
                              </DropdownMenuItem>
                              {!isPaidPurchaseRequest && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                    })
                )}
              </tbody>
            </table>
          </div>

        {/* Footer */}
        <ExpenseTableFooter 
          totalExpenses={totalExpenses}
          totalCount={allExpenses.length}
          isLoading={isLoading || isLoadingPurchaseRequests}
        />
      </div>
              </div>
            </div>

      {/* Add Expense Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) {
          // Reset amount display and date pickers when modal closes
          setAmountDisplay('');
          setIsCreateDatePickerOpen(false);
          setIsFirstPaymentDatePickerOpen(false);
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-[600px] sm:h-[600px] max-w-[600px] max-h-[90vh] p-0 overflow-hidden flex flex-col min-w-0">
          <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
            <DialogTitle className="text-lg font-semibold">Add New Expense</DialogTitle>
            <p className="text-sm text-gray-600">Enter the details for your new expense entry.</p>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll px-4 pb-4 space-y-4">
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expense Name <span className="text-red-500">*</span>
                </label>
                <Input 
                  {...form.register('expense_name')}
                  placeholder="Enter expense name"
                  className="w-full"
                />
                {form.formState.errors.expense_name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.expense_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text"
                  placeholder="Enter amount"
                  value={amountDisplay}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value);
                    setAmountDisplay(formatted);
                    const parsed = parseAmount(formatted);
                    form.setValue('amount', parsed > 0 ? parsed : undefined as any, { shouldValidate: true });
                  }}
                  className="w-full"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                  Expense Type <span className="text-red-500">*</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsExpenseTypeCrudOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Manage Expense Types
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </label>
                <Select 
                  onValueChange={handleExpenseTypeChange}
                  disabled={expenseTypesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={expenseTypesLoading ? "Loading expense types..." : "Select expense type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map(type => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                        {type.is_default && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.expense_type && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.expense_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                  Category <span className="text-red-500">*</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={!selectedExpenseTypeId}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsExpenseCategoryCrudOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Manage Categories
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </label>
                <Select 
                  onValueChange={(value) => form.setValue('category', value)}
                  disabled={!selectedExpenseTypeId || expenseCategories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      !selectedExpenseTypeId 
                        ? "Select expense type first" 
                        : expenseCategories.length === 0 
                        ? "No categories available" 
                        : "Select category"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                        {category.is_default && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                  Department
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsDepartmentCrudOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Manage Departments
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </label>
                <Select 
                  onValueChange={(value) => form.setValue('department', value)}
                  disabled={departmentsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select department (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(department => (
                      <SelectItem key={department.id} value={department.name}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Create Date <span className="text-red-500">*</span>
                </label>
                <Popover open={isCreateDatePickerOpen} onOpenChange={setIsCreateDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MM/dd/yyyy") : format(new Date(), "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate || new Date()}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          form.setValue('create_date', format(date, 'yyyy-MM-dd'));
                          setIsCreateDatePickerOpen(false); // Close popover after date selection
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Withdrawal From Balance
                </label>
                <Select 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      form.setValue('withdrawal_from_balance', undefined);
                      form.setValue('bank_account_id', undefined);
                    } else if (value.startsWith('debt_')) {
                      // Debt selection
                      const debtId = value.replace('debt_', '');
                      form.setValue('withdrawal_from_balance', debtId);
                      form.setValue('bank_account_id', undefined);
                    } else if (value.startsWith('bank_')) {
                      // Bank account selection
                      const bankId = value.replace('bank_', '');
                      form.setValue('bank_account_id', bankId);
                      form.setValue('withdrawal_from_balance', undefined);
                    }
                  }}
                  disabled={debtsLoading || bankAccountsLoading || balancesLoading}
                  value={
                    form.watch('withdrawal_from_balance') 
                      ? `debt_${form.watch('withdrawal_from_balance')}`
                      : form.watch('bank_account_id')
                        ? `bank_${form.watch('bank_account_id')}`
                        : 'none'
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={(debtsLoading || bankAccountsLoading) ? "Loading..." : "Select source (optional)"}>
                      {(() => {
                        const selectedDebtId = form.watch('withdrawal_from_balance');
                        const selectedBankId = form.watch('bank_account_id');
                        
                        if (selectedDebtId) {
                          const selectedDebt = debtsForExpense.find(d => d.id === selectedDebtId);
                          if (selectedDebt) {
                            // Hook sudah menghitung available_limit dengan benar
                            const availableLimit = selectedDebt.available_limit ?? 0;
                            const formattedLimit = `Rp ${availableLimit.toLocaleString('id-ID')}`;
                            return `${selectedDebt.debt_name} (${formattedLimit} available)`;
                          }
                        } else if (selectedBankId) {
                          const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
                          if (selectedBank) {
                            const balance = bankAccountBalances.find(b => b.bank_account_id === selectedBank.id);
                            const availableBalance = balance?.balance ?? 0;
                            const formattedBalance = `Rp ${availableBalance.toLocaleString('id-ID')}`;
                            return selectedBank.account_number
                              ? `${selectedBank.name} - ${selectedBank.account_number} (${formattedBalance} available)`
                              : `${selectedBank.name} (${formattedBalance} available)`;
                          }
                        }
                        return '';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    
                    {/* Bank Accounts Section */}
                    {bankAccounts.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Bank Accounts</div>
                        {bankAccounts.map(bankAccount => {
                          // Get or create balance if it doesn't exist
                          const balance = bankAccountBalances.find(b => b.bank_account_id === bankAccount.id);
                          // If balance doesn't exist, it will be created automatically when first transaction happens
                          // For display purposes, show 0 if balance record doesn't exist yet
                          const availableBalance = balance?.balance ?? 0;
                          const formattedBalance = `Rp ${availableBalance.toLocaleString('id-ID')}`;
                          // Format: "Bank Name - Account Number (Balance: Rp X available)"
                          const displayText = bankAccount.account_number
                            ? `${bankAccount.name} - ${bankAccount.account_number} (${formattedBalance} available)`
                            : `${bankAccount.name} (${formattedBalance} available)`;
                          return (
                            <SelectItem key={`bank_${bankAccount.id}`} value={`bank_${bankAccount.id}`}>
                              {displayText}
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Debts Section */}
                    {debtsForExpense.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Debts</div>
                        {debtsForExpense.map(debt => {
                          // Hook sudah menghitung available_limit dengan benar (termasuk fallback untuk Pinjaman Online)
                          const availableLimit = debt.available_limit ?? 0;
                          const formattedLimit = `Rp ${availableLimit.toLocaleString('id-ID')}`;
                          return (
                            <SelectItem key={`debt_${debt.id}`} value={`debt_${debt.id}`}>
                              {debt.debt_name} ({formattedLimit} available)
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {(form.watch('withdrawal_from_balance') || form.watch('bank_account_id')) && (
                  (() => {
                    const selectedDebt = form.watch('withdrawal_from_balance') 
                      ? debtsForExpense.find(d => d.id === form.watch('withdrawal_from_balance'))
                      : null;
                    const selectedBankAccount = form.watch('bank_account_id')
                      ? bankAccounts.find(b => b.id === form.watch('bank_account_id'))
                      : null;
                    const balance = selectedBankAccount 
                      ? bankAccountBalances.find(b => b.bank_account_id === selectedBankAccount.id)
                      : null;
                    
                    // Hook sudah menghitung available_limit dengan benar (termasuk fallback untuk Pinjaman Online)
                    const availableAmount = selectedDebt 
                      ? (selectedDebt.available_limit ?? 0)
                      : (balance?.balance ?? 0);
                    const expenseAmount = form.watch('amount') || 0;
                    const isInsufficient = availableAmount < expenseAmount;
                    const sourceName = selectedDebt 
                      ? selectedDebt.debt_name 
                      : selectedBankAccount?.name || '';
                    
                    return (
                      <div className="mt-2">
                        {isInsufficient ? (
                          <p className="text-sm text-red-600">
                            Insufficient balance. Available: Rp {availableAmount.toLocaleString('id-ID')}, Required: Rp {expenseAmount.toLocaleString('id-ID')}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            Available balance: Rp {availableAmount.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => form.setValue('is_recurring', checked === true)}
                />
                <label htmlFor="recurring" className="text-sm font-medium">
                  This is a recurring expense
                </label>
              </div>

              {isRecurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Recurring Frequency <span className="text-red-500">*</span>
                    </label>
                    <Select onValueChange={(value) => form.setValue('recurring_frequency', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_FREQUENCIES.map(freq => (
                          <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">First Payment Date</label>
                    <Popover open={isFirstPaymentDatePickerOpen} onOpenChange={setIsFirstPaymentDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !firstPaymentDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {firstPaymentDate ? format(firstPaymentDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={firstPaymentDate}
                          onSelect={(date) => {
                            setFirstPaymentDate(date);
                            if (date) {
                              form.setValue('first_payment_date', format(date, 'yyyy-MM-dd'));
                              setIsFirstPaymentDatePickerOpen(false); // Close popover after date selection
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea 
                  {...form.register('description')}
                  placeholder="Additional details about this expense (optional)"
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Receipt</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="receipt-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t flex-shrink-0 bg-white">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsAddModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department CRUD Modal */}
      <DepartmentCrudModal 
        isOpen={isDepartmentCrudOpen}
        onClose={() => setIsDepartmentCrudOpen(false)}
        onDepartmentChange={refetchDepartments}
      />

      {/* Expense Type CRUD Modal */}
      <ExpenseTypeCrudModal 
        isOpen={isExpenseTypeCrudOpen}
        onClose={() => setIsExpenseTypeCrudOpen(false)}
        onExpenseTypeChange={refetchExpenseTypes}
      />

      {/* Expense Category CRUD Modal */}
      <ExpenseCategoryCrudModal 
        isOpen={isExpenseCategoryCrudOpen}
        onClose={() => setIsExpenseCategoryCrudOpen(false)}
        onExpenseCategoryChange={refetchExpenseCategories}
      />

      {/* Expense Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto min-w-0">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              View detailed information about this expense
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Expense Name</label>
                  <p className="text-sm font-semibold mt-1">{selectedExpense.expense_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-sm mt-1">{selectedExpense.expense_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-sm mt-1">{selectedExpense.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="text-sm mt-1">{selectedExpense.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedExpense.is_recurring ? 'default' : 'secondary'}>
                      {selectedExpense.is_recurring ? 'Recurring' : 'One-time'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Date</label>
                  <p className="text-sm mt-1">{format(new Date(selectedExpense.create_date), 'dd MMM yyyy')}</p>
                </div>
                {selectedExpense.next_payment_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Next Payment</label>
                    <p className="text-sm mt-1">{format(new Date(selectedExpense.next_payment_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
                {selectedExpense.is_recurring && selectedExpense.recurring_frequency && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Recurring Frequency</label>
                    <p className="text-sm mt-1 capitalize">{selectedExpense.recurring_frequency}</p>
                  </div>
                )}
                {selectedExpense.first_payment_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Payment Date</label>
                    <p className="text-sm mt-1">{format(new Date(selectedExpense.first_payment_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
              </div>
              {selectedExpense.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm mt-1">{selectedExpense.description}</p>
                </div>
              )}
              {selectedExpense.receipt_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Receipt</label>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(selectedExpense.receipt_url)}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm mt-1">{format(new Date(selectedExpense.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                {selectedExpense.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Updated At</label>
                    <p className="text-sm mt-1">{format(new Date(selectedExpense.updated_at), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setExpenseToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Date Picker Dialog */}
      <CustomDatePicker
        isOpen={isCustomDatePickerOpen}
        onClose={() => setIsCustomDatePickerOpen(false)}
        onDateRangeSelect={(startDate, endDate) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
          setDateFilter('custom');
          setIsCustomDatePickerOpen(false);
        }}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />
          </div>
        </div>
      </div>
    </div>
  );
}
