import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  HeaderAndTab,
  ReminderBillsFilters,
  ReminderBillsMetricsCards,
  ReminderBillsTable,
  ReminderBillsTableFooter,
  ReminderBillsOverview,
  ReminderBillsSidebarFooter,
  type ReminderBillsFiltersType
} from './section';
import { useExpenses, Expense, useExpenseTypes, useExpenseCategories } from '@/features/4_2_dashboard/hooks';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { ReminderBillDetailDialog, ReminderBillDeleteDialog } from './components/ReminderBillsActionModals';
import { ReminderBillPayNowModal } from './components/ReminderBillPayNowModal';
import { usePurchaseRequests, PurchaseRequest } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { filterReminderBills, calculateNextPaymentDate } from './utils/reminderBillsUtils';

export const ReminderBillsPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reminder-bills');
  const [detailBill, setDetailBill] = useState<Expense | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPayNowModalOpen, setIsPayNowModalOpen] = useState(false);
  const [selectedPayNowBill, setSelectedPayNowBill] = useState<Expense | null>(null);
  const [filters, setFilters] = useState<ReminderBillsFiltersType>({
    search: '',
    status: 'all',
    category: 'all',
    department: 'all'
  });
  
  const { expenses = [], isLoading, refetch, dismissReminderBillFromList } = useExpenses();
  const { data: purchaseRequests = [], isLoading: isLoadingPurchaseRequests } = usePurchaseRequests();
  const { expenseTypes } = useExpenseTypes();
  const { expenseCategories: allExpenseCategories } = useExpenseCategories();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter purchase requests that are paid and recurring
  const paidRecurringPurchaseRequests = useMemo(() => {
    return purchaseRequests.filter(req =>
      req.status === 'approved' &&
      (req.paid_at || req.payment_status === 'paid') &&
      req.is_recurring === true &&
      req.recurring_frequency
    );
  }, [purchaseRequests]);

  // Helper function to get expense type name from purchase request
  const getExpenseTypeName = (pr: PurchaseRequest): string => {
    if (pr.expense_types?.name) {
      return pr.expense_types.name;
    }
    if (pr.expense_type_id && expenseTypes.length > 0) {
      const expenseType = expenseTypes.find(et => et.id === pr.expense_type_id);
      if (expenseType) return expenseType.name;
    }
    return 'Uncategorized';
  };

  // Helper function to get expense category name from purchase request
  const getExpenseCategoryName = (pr: PurchaseRequest): string => {
    if (pr.expense_categories?.name) {
      return pr.expense_categories.name;
    }
    if (pr.expense_category_id && allExpenseCategories.length > 0) {
      const expenseCategory = allExpenseCategories.find(ec => ec.id === pr.expense_category_id);
      if (expenseCategory) return expenseCategory.name;
    }
    return pr.request_type || 'Purchase';
  };

  // Calculate next payment dates for recurring expenses that are missing them
  const expensesWithNextPayment = useMemo(() => {
    return expenses
      .filter((expense) => !expense.exclude_from_reminder_bills)
      .map(expense => {
      // If expense is recurring but missing next_payment_date, calculate it
      if (expense.is_recurring && expense.recurring_frequency && !expense.next_payment_date) {
        const nextPaymentDate = calculateNextPaymentDate(expense.create_date, expense.recurring_frequency);
        return {
          ...expense,
          next_payment_date: nextPaymentDate || expense.next_payment_date,
        };
      }
      
      // If expense is recurring and has next_payment_date but it's expired, calculate next one
      if (expense.is_recurring && expense.recurring_frequency && expense.next_payment_date) {
        const nextPayment = new Date(expense.next_payment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (nextPayment < today) {
          const nextPaymentDate = calculateNextPaymentDate(expense.next_payment_date, expense.recurring_frequency);
          return {
            ...expense,
            next_payment_date: nextPaymentDate || expense.next_payment_date,
          };
        }
      }
      
      return expense;
    });
  }, [expenses]);

  // Combine expenses with paid recurring purchase requests
  const allBills = useMemo(() => {
    const combined: Expense[] = expensesWithNextPayment.map((e) => ({
      ...e,
      bill_source: e.bill_source ?? 'expense',
    }));

    // Add paid recurring purchase requests as bills
    paidRecurringPurchaseRequests.forEach(pr => {
      const expenseTypeName = getExpenseTypeName(pr);
      const expenseCategoryName = getExpenseCategoryName(pr);
      
      // Calculate next payment date for recurring purchase requests
      const lastPaymentDate = pr.paid_at || pr.approved_at || pr.created_at;
      const nextPaymentDate = calculateNextPaymentDate(lastPaymentDate, pr.recurring_frequency || undefined);
      
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
        is_recurring: true,
        recurring_frequency: pr.recurring_frequency || undefined,
        first_payment_date: undefined,
        next_payment_date: nextPaymentDate,
        description: pr.description,
        receipt_url: pr.invoice_file_path || undefined,
        status: 'active',
        created_by: pr.created_by,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        bill_source: 'purchase_request',
      } as Expense);
    });

    // Sort by next_payment_date (earliest first) or create_date if no next_payment_date
    return combined.sort((a, b) => {
      const dateA = a.next_payment_date ? new Date(a.next_payment_date).getTime() : new Date(a.create_date).getTime();
      const dateB = b.next_payment_date ? new Date(b.next_payment_date).getTime() : new Date(b.create_date).getTime();
      return dateA - dateB;
    });
  }, [expensesWithNextPayment, paidRecurringPurchaseRequests, expenseTypes, allExpenseCategories]);

  // Filter bills - only recurring expenses
  const recurringBills = useMemo(() => {
    return allBills.filter(expense => expense.is_recurring);
  }, [allBills]);

  const filteredBills = useMemo(() => {
    return filterReminderBills(allBills, filters);
  }, [allBills, filters]);

  const handleFilterChange = useCallback((key: keyof ReminderBillsFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      department: 'all'
    });
  }, []);

  const handleViewBill = useCallback((bill: Expense) => {
    setDetailBill(bill);
    setIsDetailOpen(true);
  }, []);

  const handleEditBill = useCallback(
    (bill: Expense) => {
      if (bill.bill_source === 'purchase_request') {
        toast.message(
          t('reminderBills.editPurchaseRequestTitle', 'Manage in Payment process'),
          {
            description: t(
              'reminderBills.editPurchaseRequestHint',
              'Edit or manage this bill from the Payment process page.'
            ),
          }
        );
        navigate('/expenses/payment-process');
        return;
      }
      navigate('/expenses/dashboard', { state: { openExpenseEditId: bill.id } });
    },
    [navigate, t]
  );

  const handleDeleteBill = useCallback(
    (bill: Expense) => {
      if (bill.bill_source === 'purchase_request') {
        toast.info(
          t(
            'reminderBills.cannotDeletePurchaseRequestBill',
            'Bills from purchase requests cannot be removed here. Use the request or payment workflow.'
          )
        );
        return;
      }
      setDeleteBillId(bill.id);
      setIsDeleteOpen(true);
    },
    [t]
  );

  const handlePayNow = useCallback((bill: Expense) => {
    setSelectedPayNowBill(bill);
    setIsPayNowModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteBillId) return;
    const ok = await dismissReminderBillFromList(deleteBillId);
    if (ok) {
      setIsDeleteOpen(false);
      setDeleteBillId(null);
      refetch();
    }
  }, [deleteBillId, dismissReminderBillFromList, refetch]);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  }, [filteredBills]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header and Tabs */}
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>

          {/* Grid Layout: full height, table & sidebar satu scroll per panel (scroll chaining) */}
          <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 max-h-[calc(100vh-120px)] overflow-hidden grid-rows-1">
            {/* Main Content - 9 columns, full height */}
            <div className="col-span-9 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full">
                {/* Filter Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="bg-white border rounded-md p-2">
                    <ReminderBillsFilters 
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </div>
                
                {/* Metrics Cards Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    <ReminderBillsMetricsCards />
                  </div>
                </div>
                
                {/* Table Section - scroll container di dalam ReminderBillsTable */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <ReminderBillsTable
                      bills={filteredBills}
                      onRefresh={handleRefresh}
                      isLoading={isLoading || isLoadingPurchaseRequests}
                      onViewDetails={handleViewBill}
                      onEdit={handleEditBill}
                      onDelete={handleDeleteBill}
                      onPayNow={handlePayNow}
                    />
                    <ReminderBillsTableFooter
                      totalBills={recurringBills.length}
                      filteredBills={filteredBills.length}
                      totalAmount={totalAmount}
                      selectedStatus={filters.status}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Overview Sidebar, scroll chaining */}
            <div className="col-span-3 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Sidebar Header */}
                <div className="px-4 py-1.5 border-b flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">Bills Overview</h3>
                      <p className="text-xs text-gray-500 mt-1">Summary of recurring bills</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Sidebar Content - satu scroll container, chain ke halaman */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
                    <ReminderBillsOverview bills={filteredBills} />
                  </div>
                </div>

                {/* Sidebar Footer */}
                <ReminderBillsSidebarFooter 
                  totalBills={filteredBills.length}
                  totalAmount={totalAmount}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReminderBillDetailDialog bill={detailBill} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
      <ReminderBillDeleteDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteBillId(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <ReminderBillPayNowModal
        open={isPayNowModalOpen}
        onOpenChange={(next) => {
          setIsPayNowModalOpen(next);
          if (!next) setSelectedPayNowBill(null);
        }}
        bill={selectedPayNowBill}
      />
    </div>
  );
};
