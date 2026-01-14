import { useState, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Card, CardContent } from '@/features/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Badge } from '@/features/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Plus, Search, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, Receipt, Eye, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/features/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useExpenses, CreateExpenseData, useExpenseTypes, useExpenseCategories, Expense } from './hooks';
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  const { organizationId } = useCurrentOrg();
  const { expenses, isLoading, isCreating, createExpense, deleteExpense } = useExpenses();
  const { data: departments = [], isLoading: departmentsLoading, refetch: refetchDepartments } = useDepartmentsCrud(organizationId);
  const { expenseTypes, isLoading: expenseTypesLoading, refetch: refetchExpenseTypes } = useExpenseTypes();
  const { data: purchaseRequests = [], isLoading: isLoadingPurchaseRequests } = usePurchaseRequests();
  // Fetch all expense categories (without filter) for fallback lookup
  const { expenseCategories: allExpenseCategories } = useExpenseCategories();
  
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
  const { expenseCategories, refetch: refetchExpenseCategories } = useExpenseCategories(selectedExpenseTypeId);

  const form = useForm<AddExpenseFormData>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      expense_name: '',
      amount: 0,
      expense_type: '',
      category: '',
      department: '',
      create_date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      recurring_frequency: '',
      first_payment_date: '',
      description: '',
    },
  });

  const isRecurring = form.watch('is_recurring');

  const handleSubmit = async (data: AddExpenseFormData) => {
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
    };

    const success = await createExpense(expenseData);
    if (success) {
      setIsAddModalOpen(false);
      form.reset();
      setReceiptFile(null);
      setSelectedDate(undefined);
      setFirstPaymentDate(undefined);
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
      const success = await deleteExpense(expenseToDelete);
      if (success) {
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
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
    return combined.sort((a, b) => {
      const dateA = new Date(a.create_date).getTime();
      const dateB = new Date(b.create_date).getTime();
      return dateB - dateA;
    });
  }, [expenses, paidPurchaseRequests]);

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
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="h-full flex flex-col overflow-hidden">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>
            
            {/* Content Area - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
              <div className="p-2 bg-gradient-to-br from-gray-50 to-white min-h-full flex flex-col">
              {/* Header Card */}
      <Card className="mb-4 bg-blue-600 text-white border-0 w-full">
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold mb-1 text-white">Total Expenses</h1>
              <p className="text-blue-100 text-sm">{allExpenses.length} total transactions</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        <Card>
        <CardContent className="p-3">
            <div className="text-sm text-gray-600 mb-1">Current Month Total</div>
            <div className="text-2xl font-bold mb-1">{formatCurrency(currentMonthTotal)}</div>
            <div className="text-xs text-gray-500">vs. last month</div>
            <div className="text-xs text-green-600 mt-1">↑ {currentMonthTotal > 0 ? '100' : '0'}%</div>
          </CardContent>
        </Card>

        <Card>
        <CardContent className="p-3">
            <div className="text-sm text-gray-600 mb-1">Total Expenses YTD</div>
            <div className="text-2xl font-bold mb-1">{formatCurrency(totalExpenses)}</div>
            <div className="text-xs text-gray-500">{expenses.length} transactions</div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardContent className="p-3">
            <div className="text-sm text-gray-600 mb-1">Highest Expense</div>
            <div className="text-2xl font-bold mb-1">
              {allExpenses.length > 0 ? formatCurrency(Math.max(...allExpenses.map(e => e.amount))) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500">
              {allExpenses.length > 0 ? allExpenses.find(e => e.amount === Math.max(...allExpenses.map(ex => ex.amount)))?.expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-500">
                {allExpenses.length > 0 ? format(new Date(allExpenses[0].create_date), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-gray-600 mb-1">Latest Transaction</div>
            <div className="text-2xl font-bold mb-1">
              {allExpenses.length > 0 ? formatCurrency(allExpenses[0].amount) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500">
              {allExpenses.length > 0 ? allExpenses[0].expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-500">
                {allExpenses.length > 0 ? format(new Date(allExpenses[0].created_at), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
        <Card className="flex flex-col">
        <CardContent className="p-3 flex-1 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Expense Breakdown</h3>
            <p className="text-sm text-gray-600 mb-4">By expense type</p>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{new Set(allExpenses.map(e => e.expense_type)).size}</div>
                <div className="text-sm text-gray-600">Expense Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>

            {allExpenses.length > 0 ? (
              <>
                <div className="mt-4 h-32 bg-gray-100 rounded flex items-end justify-center gap-1 p-2">
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
                        <div
                          key={expenseType}
                          className={`flex-1 ${colorClass} rounded-t`}
                          style={{ height: `${Math.max(heightPercentage, 8)}%` }}
                          title={`${expenseType}: ${formatCurrency(amount)}`}
                        />
                      );
                    });
                  })()}
                </div>
                
                <div className="flex justify-between text-xs text-gray-600 mt-2 overflow-x-auto">
                  {Object.keys(allExpenses.reduce((acc, expense) => {
                    const expenseType = expense.expense_type || 'Uncategorized';
                    acc[expenseType] = true;
                    return acc;
                  }, {} as Record<string, boolean>)).map((expenseType) => (
                    <span key={expenseType} className="truncate flex-1 text-center" title={expenseType}>
                      {expenseType.length > 10 ? expenseType.substring(0, 10) + '...' : expenseType}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 h-32 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-gray-500 text-sm">No expense data available</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="p-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Monthly Comparison</h3>
                <p className="text-sm text-gray-600">Expense trends throughout the year</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>

            <div className="flex-1 min-h-0">
              {monthlyData.length > 0 && monthlyData.some(d => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
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

            <div className="flex items-center mt-4 flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-w-0 flex-1">
        {/* Table Header with Search and Filters */}
        <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0 min-w-0">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center space-x-4 flex-wrap min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select defaultValue="all-dates">
                <SelectTrigger className="w-32">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-dates">All Dates</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all-depts">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-depts">All Depts</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all-types">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 min-w-0 seamless-scroll overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1400px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Payment Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Next Payment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Request</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Request By</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Recurring</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(isLoading || isLoadingPurchaseRequests) ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-gray-500">
                      Loading expenses...
                    </td>
                  </tr>
                ) : allExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-gray-500">
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
                        <td className="py-3 px-4 whitespace-nowrap">{format(new Date(expense.create_date), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{expense.next_payment_date ? format(new Date(expense.next_payment_date), 'dd MMM yyyy') : '-'}</td>
                        <td className="py-3 px-4 max-w-[250px]">
                          <div className="truncate" title={expense.expense_type}>
                            {expense.expense_type}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[250px]">
                          <div className="truncate" title={expense.category}>
                            {expense.category}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="truncate" title={expense.department || 'N/A'}>
                            {expense.department || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="truncate" title={requestTitle || expense.expense_name || '-'}>
                            {requestTitle || expense.expense_name || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[250px]">
                          <div className="truncate" title={expense.description || '-'}>
                            {expense.description || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[150px]">
                          <div className="truncate" title={requesterName || '-'}>
                            {requesterName || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={expense.is_recurring ? 'default' : 'secondary'}>
                            {expense.is_recurring ? 'Recurring' : 'One-time'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={isPaidPurchaseRequest ? 'default' : 'secondary'}>
                            {isPaidPurchaseRequest ? 'Berhasil' : (expense.is_recurring ? 'Recurring' : 'One-time')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
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
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[600px] h-[600px] max-w-none p-0 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 p-4 pb-2">
            <DialogTitle className="text-lg font-semibold">Add New Expense</DialogTitle>
            <p className="text-sm text-gray-600">Enter the details for your new expense entry.</p>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              
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
                  {...form.register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
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
                <Popover>
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
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                    <Popover>
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

            <div className="flex justify-end space-x-3 p-4 pt-2 border-t flex-shrink-0 bg-white">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
}
