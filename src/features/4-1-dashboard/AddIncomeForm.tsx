import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Checkbox } from '@/features/ui/checkbox';
import { useIncomeTransactions } from './hooks';
import { useIncomeMasterData } from './hooks';
import { CreateIncomeTransactionData } from './types';

const formSchema = z.object({
  transaction_date: z.string().min(1, 'Transaction date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  customer_name: z.string().optional(),
  payment_method: z.string().optional(),
  income_type_id: z.string().optional(),
  category_id: z.string().optional(),
  service_id: z.string().optional(),
  sub_service_id: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddIncomeFormProps {
  onSuccess: () => void;
}

export function AddIncomeForm({ onSuccess }: AddIncomeFormProps) {
  const { createIncomeTransaction, isCreating } = useIncomeTransactions();
  const { incomeTypes, incomeCategories, services, subServices } = useIncomeMasterData();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: new Date().toISOString().split('T')[0],
      amount: 0,
      is_recurring: false,
    },
  });

  const watchedServiceId = form.watch('service_id');
  const watchedIncomeTypeId = form.watch('income_type_id');
  const watchedIsRecurring = form.watch('is_recurring');

  const filteredSubServices = subServices.filter(
    subService => subService.service_id === watchedServiceId
  );

  const filteredIncomeCategories = incomeCategories.filter(
    category => category.income_types_id === watchedIncomeTypeId
  );

  const onSubmit = (data: FormData) => {
    // Ensure transaction_date is always provided and properly typed
    const transactionData: CreateIncomeTransactionData = {
      transaction_date: data.transaction_date, // This is guaranteed to be a string due to form validation
      amount: data.amount,
      customer_name: data.customer_name,
      payment_method: data.payment_method,
      income_type_id: data.income_type_id,
      category_id: data.category_id,
      service_id: data.service_id,
      sub_service_id: data.sub_service_id,
      is_recurring: data.is_recurring,
      recurring_frequency: data.recurring_frequency,
      description: data.description,
      receipt_file: receiptFile || undefined,
    };

    createIncomeTransaction(transactionData, {
      onSuccess: () => {
        form.reset();
        setReceiptFile(null);
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transaction_date">Transaction Date</Label>
          <Input
            id="transaction_date"
            type="date"
            {...form.register('transaction_date')}
            className="text-sm"
          />
          {form.formState.errors.transaction_date && (
            <p className="text-sm text-red-600">{form.formState.errors.transaction_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...form.register('amount', { valueAsNumber: true })}
            className="text-sm"
            placeholder="0.00"
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input
            id="customer_name"
            {...form.register('customer_name')}
            className="text-sm"
            placeholder="Enter customer name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">Payment Method</Label>
          <Select onValueChange={(value) => form.setValue('payment_method', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="debit_card">Debit Card</SelectItem>
              <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="income_type_id">Income Type</Label>
          <Select onValueChange={(value) => {
            form.setValue('income_type_id', value);
            form.setValue('category_id', ''); // Reset category when income type changes
          }}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select income type" />
            </SelectTrigger>
            <SelectContent>
              {incomeTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <Select 
            onValueChange={(value) => form.setValue('category_id', value)}
            disabled={!watchedIncomeTypeId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredIncomeCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service_id">Service</Label>
          <Select onValueChange={(value) => {
            form.setValue('service_id', value);
            form.setValue('sub_service_id', ''); // Reset sub-service when service changes
          }}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sub_service_id">Sub Service</Label>
          <Select 
            onValueChange={(value) => form.setValue('sub_service_id', value)}
            disabled={!watchedServiceId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select sub service" />
            </SelectTrigger>
            <SelectContent>
              {filteredSubServices.map((subService) => (
                <SelectItem key={subService.id} value={subService.id}>
                  {subService.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_recurring"
            checked={watchedIsRecurring}
            onCheckedChange={(checked) => form.setValue('is_recurring', checked as boolean)}
          />
          <Label htmlFor="is_recurring" className="text-sm">Recurring Transaction</Label>
        </div>
      </div>

      {watchedIsRecurring && (
        <div className="space-y-2">
          <Label htmlFor="recurring_frequency">Recurring Frequency</Label>
          <Select onValueChange={(value) => form.setValue('recurring_frequency', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          className="text-sm"
          placeholder="Enter transaction description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt File</Label>
        <Input
          id="receipt"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Transaction'}
        </Button>
      </div>
    </form>
  );
}
