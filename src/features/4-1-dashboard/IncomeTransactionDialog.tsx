
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Checkbox } from '@/features/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/features/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useIncomeTransactions } from './hooks';
import { IncomeTransactionWithRelations, CreateIncomeTransactionData } from './types';
import { useIncomeMasterData } from './hooks';
import { useBankAccounts } from '@/hooks/organized/useBankAccounts';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';

const formSchema = z.object({
  transaction_date: z.string().min(1, 'Transaction date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  customer_name: z.string().optional(),
  payment_method: z.string().optional(),
  bank_account_id: z.string().optional(),
  income_type_id: z.string().optional(),
  category_id: z.string().optional(),
  service_id: z.string().optional(),
  sub_service_id: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.string().optional(),
  description: z.string().optional(),
  receipt_file: z.instanceof(File).optional(),
}).superRefine((data, ctx) => {
  if (data.payment_method === 'bank_transfer') {
    const id = data.bank_account_id?.trim();
    if (!id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a bank account for bank transfer',
        path: ['bank_account_id'],
      });
    }
  }
});

interface IncomeTransactionDialogProps {
  income: IncomeTransactionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncomeTransactionDialog = ({ 
  income, 
  open, 
  onOpenChange 
}: IncomeTransactionDialogProps) => {
  const { createIncomeTransaction, updateIncomeTransaction, isCreating, isUpdating } = useIncomeTransactions();
  const { incomeTypes, incomeCategories, services, subServices } = useIncomeMasterData();
  const { bankAccounts } = useBankAccounts({ includeInactive: true });

  /** Ensures the linked account appears in the Select (inactive or missing from list still shows a matching SelectItem). */
  const bankAccountSelectOptions = useMemo(() => {
    const rows = bankAccounts.map((b) => ({
      id: b.id,
      label: `${b.name}${b.account_number ? ` (${b.account_number})` : ''}`,
    }));
    const linkedId = income?.bank_account_id?.trim();
    if (!linkedId || rows.some((r) => r.id === linkedId)) {
      return rows;
    }
    const rel = income?.bank_accounts;
    const label =
      rel?.name != null && String(rel.name).length > 0
        ? `${rel.name}${rel.account_number ? ` (${rel.account_number})` : ''}`
        : 'Previously selected account';
    return [{ id: linkedId, label }, ...rows];
  }, [bankAccounts, income]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: new Date().toISOString().split('T')[0],
      amount: 0,
      customer_name: '',
      payment_method: '',
      bank_account_id: '',
      income_type_id: '',
      category_id: '',
      service_id: '',
      sub_service_id: '',
      is_recurring: false,
      recurring_frequency: '',
      description: '',
    },
  });

  // Reset when dialog opens or the selected transaction changes (so Edit always shows saved bank_account_id)
  useEffect(() => {
    if (!open) return;
    if (income) {
      const txDate =
        typeof income.transaction_date === 'string' && income.transaction_date.length >= 10
          ? income.transaction_date.slice(0, 10)
          : income.transaction_date;
      form.reset({
        transaction_date: txDate,
        amount: income.amount,
        customer_name: income.customer_name || '',
        payment_method: income.payment_method || '',
        bank_account_id: income.bank_account_id?.trim() || '',
        income_type_id: income.income_type_id || '',
        category_id: income.category_id || '',
        service_id: income.service_id || '',
        sub_service_id: income.sub_service_id || '',
        is_recurring: income.is_recurring,
        recurring_frequency: income.recurring_frequency || '',
        description: income.description || '',
      });
    } else {
      form.reset({
        transaction_date: new Date().toISOString().split('T')[0],
        amount: 0,
        customer_name: '',
        payment_method: '',
        bank_account_id: '',
        income_type_id: '',
        category_id: '',
        service_id: '',
        sub_service_id: '',
        is_recurring: false,
        recurring_frequency: '',
        description: '',
      });
    }
  }, [income, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const bankId = values.bank_account_id?.trim() || null;
      if (income) {
        updateIncomeTransaction({
          id: income.id,
          ...values,
          bank_account_id: bankId,
        });
      } else {
        createIncomeTransaction({
          ...(values as CreateIncomeTransactionData),
          bank_account_id: bankId ?? undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving income transaction:', error);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'check', label: 'Check' },
    { value: 'digital_wallet', label: 'Digital Wallet' },
    { value: 'other', label: 'Other' },
  ];

  const recurringFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {income ? 'Edit Income Transaction' : 'Add Income Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v !== 'bank_transfer') {
                          form.setValue('bank_account_id', '');
                        }
                      }}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v)}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccountSelectOptions.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categories */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="income_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Income Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select income type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incomeTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incomeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sub_service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Service</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subServices.map((subService) => (
                          <SelectItem key={subService.id} value={subService.id}>
                            {subService.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recurring */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Recurring Transaction</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('is_recurring') && (
                <FormField
                  control={form.control}
                  name="recurring_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurring Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recurringFrequencies.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transaction description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Upload */}
            <FormField
              control={form.control}
              name="receipt_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.onChange(file);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : (income ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
