import { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Card, CardContent } from '@/features/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
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
import { useExpenses, CreateExpenseData, useExpenseTypes, useExpenseCategories } from './hooks';
import { addExpenseSchema, AddExpenseFormData, RECURRING_FREQUENCIES } from './AddExpenseForm';
import { useDepartmentsCrud } from '@/features/2-1-employees/MyInfo/Employment/hooks/crudMaster/useDepartmentsCrud';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { DepartmentCrudModal } from './DepartmentCrudModal';
import { ExpenseTypeCrudModal } from './ExpenseTypeCrudModal';
import { ExpenseCategoryCrudModal } from './ExpenseCategoryCrudModal';
import { HeaderAndTab } from './HeaderAndTab';

export function ExpenseDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  const { organizationId } = useCurrentOrg();
  const { expenses, isLoading, isCreating, createExpense } = useExpenses();
  const { data: departments = [], isLoading: departmentsLoading, refetch: refetchDepartments } = useDepartmentsCrud(organizationId);
  const { expenseTypes, isLoading: expenseTypesLoading, refetch: refetchExpenseTypes } = useExpenseTypes();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepartmentCrudOpen, setIsDepartmentCrudOpen] = useState(false);
  const [isExpenseTypeCrudOpen, setIsExpenseTypeCrudOpen] = useState(false);
  const [isExpenseCategoryCrudOpen, setIsExpenseCategoryCrudOpen] = useState(false);
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

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentMonthTotal = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.create_date);
      const currentDate = new Date();
      return expenseDate.getMonth() === currentDate.getMonth() && 
             expenseDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

    const handleExpenseTypeChange = (value: string) => {
      form.setValue('expense_type', value);
      setSelectedExpenseTypeId(expenseTypes.find(type => type.name === value)?.id || '');
      // Reset category when expense type changes
      form.setValue('category', '');
    };

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header and Tabs */}
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>
          
          <div className="flex-1 min-h-0 seamless-scroll max-h-[calc(100vh-120px)]">
            <div className="p-2 bg-gradient-to-br from-gray-50 to-white">
              {/* Header Card */}
      <Card className="mb-4 bg-blue-600 text-white border-0">
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold mb-1 text-white">Total Expenses</h1>
              <p className="text-blue-100 text-sm">{expenses.length} total transactions</p>
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
              {expenses.length > 0 ? formatCurrency(Math.max(...expenses.map(e => e.amount))) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500">
              {expenses.length > 0 ? expenses.find(e => e.amount === Math.max(...expenses.map(ex => ex.amount)))?.expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-500">
                {expenses.length > 0 ? format(new Date(expenses[0].create_date), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-gray-600 mb-1">Latest Transaction</div>
            <div className="text-2xl font-bold mb-1">
              {expenses.length > 0 ? formatCurrency(expenses[0].amount) : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-500">
              {expenses.length > 0 ? expenses[0].expense_name : 'No expenses yet'}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-500">
                {expenses.length > 0 ? format(new Date(expenses[0].created_at), 'dd MMM yyyy') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
        <Card>
        <CardContent className="p-3">
            <h3 className="text-lg font-semibold mb-2">Expense Breakdown</h3>
            <p className="text-sm text-gray-600 mb-4">By expense type</p>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{new Set(expenses.map(e => e.category)).size}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>

            {expenses.length > 0 ? (
              <>
                <div className="mt-4 h-32 bg-gray-100 rounded flex items-end justify-center gap-1 p-2">
                  {(() => {
                    // Calculate category totals
                    const categoryTotals = expenses.reduce((acc, expense) => {
                      const category = expense.category || 'Uncategorized';
                      acc[category] = (acc[category] || 0) + expense.amount;
                      return acc;
                    }, {} as Record<string, number>);

                    const maxAmount = Math.max(...Object.values(categoryTotals));
                    const colors = ['bg-green-500', 'bg-green-400', 'bg-blue-500', 'bg-blue-400', 'bg-purple-500', 'bg-purple-400'];
                    
                    return Object.entries(categoryTotals).map(([category, amount], index) => {
                      const heightPercentage = maxAmount > 0 ? (amount / maxAmount) * 80 : 0;
                      const colorClass = colors[index % colors.length];
                      
                      return (
                        <div
                          key={category}
                          className={`flex-1 ${colorClass} rounded-t`}
                          style={{ height: `${Math.max(heightPercentage, 8)}%` }}
                          title={`${category}: ${formatCurrency(amount)}`}
                        />
                      );
                    });
                  })()}
                </div>
                
                <div className="flex justify-between text-xs text-gray-600 mt-2 overflow-x-auto">
                  {Object.keys(expenses.reduce((acc, expense) => {
                    const category = expense.category || 'Uncategorized';
                    acc[category] = true;
                    return acc;
                  }, {} as Record<string, boolean>)).map((category) => (
                    <span key={category} className="truncate flex-1 text-center" title={category}>
                      {category.length > 10 ? category.substring(0, 10) + '...' : category}
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

        <Card>
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Monthly Comparison</h3>
                <p className="text-sm text-gray-600">Expense trends throughout the year</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>

            <div className="h-32 bg-gray-100 rounded mb-4"></div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>

            <div className="flex items-center mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Table Section */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header with Search and Filters */}
          <div className="p-3 border-b bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Payment Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Next Payment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No expenses found. Click "Add Expense" to create your first expense.
                    </td>
                  </tr>
                ) : (
                  expenses
                    .filter(expense => 
                      expense.expense_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      expense.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{format(new Date(expense.create_date), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4">{expense.next_payment_date ? format(new Date(expense.next_payment_date), 'dd MMM yyyy') : '-'}</td>
                        <td className="py-3 px-4">{expense.expense_type}</td>
                        <td className="py-3 px-4">{expense.category}</td>
                        <td className="py-3 px-4">{expense.department || 'N/A'}</td>
                        <td className="py-3 px-4 font-medium">{formatCurrency(expense.amount)}</td>
                        <td className="py-3 px-4">{expense.description || '-'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={expense.is_recurring ? 'default' : 'secondary'}>
                            {expense.is_recurring ? 'Recurring' : 'One-time'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {expense.receipt_url && (
                                <DropdownMenuItem onClick={() => window.open(expense.receipt_url!, '_blank')}>
                                  <Receipt className="h-4 w-4 mr-2 text-gray-600" />
                                  View Receipt
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2 text-gray-600" />
                                Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
