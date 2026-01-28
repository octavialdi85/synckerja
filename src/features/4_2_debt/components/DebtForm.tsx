import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Debt, CreateDebtData, DEBT_TYPES } from '../types';
import { formatInputNumber, parseInputNumber } from '../utils/numberFormat';

const debtSchema = z.object({
  debt_name: z.string().min(1, 'Nama hutang harus diisi'),
  debt_type: z.string().min(1, 'Tipe hutang harus dipilih'),
  bank_name: z.string().optional(),
  limit_amount: z.number().min(0, 'Limit harus lebih dari 0'),
  available_limit: z.number().min(0).optional(),
  used_amount: z.number().min(0, 'Jumlah terpakai harus lebih dari 0'),
  debt_amount: z.number().min(0, 'Hutang harus lebih dari 0'),
  interest_rate: z.number().min(0).max(100).optional(),
  due_date: z.string().optional(),
  minimum_payment: z.number().min(0).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paid_off', 'closed']).optional(),
}).refine((data) => {
  // Validate that used_amount doesn't exceed limit_amount
  return data.used_amount <= data.limit_amount;
}, {
  message: 'Jumlah terpakai tidak boleh melebihi limit',
  path: ['used_amount'],
}).refine((data) => {
  // Validate that available_limit doesn't exceed limit_amount
  if (data.available_limit !== undefined && data.available_limit !== null) {
    return data.available_limit <= data.limit_amount;
  }
  return true;
}, {
  message: 'Limit tersedia tidak boleh melebihi limit platform',
  path: ['available_limit'],
});

type DebtFormData = z.infer<typeof debtSchema>;

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDebtData) => Promise<boolean>;
  initialData?: Debt;
  isLoading?: boolean;
}

export const DebtForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  isLoading = false 
}: DebtFormProps) => {
  const isEditMode = !!initialData;
  
  // State for formatted display values
  const [limitAmountDisplay, setLimitAmountDisplay] = useState('');
  const [availableLimitDisplay, setAvailableLimitDisplay] = useState('');
  const [usedAmountDisplay, setUsedAmountDisplay] = useState('');
  const [debtAmountDisplay, setDebtAmountDisplay] = useState('');
  const [interestRateDisplay, setInterestRateDisplay] = useState('');
  const [minimumPaymentDisplay, setMinimumPaymentDisplay] = useState('');
  
  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      debt_name: '',
      debt_type: '',
      bank_name: '',
      limit_amount: 0,
      available_limit: undefined,
      used_amount: 0,
      debt_amount: 0,
      interest_rate: undefined,
      due_date: undefined,
      minimum_payment: undefined,
      description: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        debt_name: initialData.debt_name,
        debt_type: initialData.debt_type,
        bank_name: initialData.bank_name || '',
        limit_amount: initialData.limit_amount,
        available_limit: initialData.available_limit || undefined,
        used_amount: initialData.used_amount,
        debt_amount: initialData.debt_amount,
        interest_rate: initialData.interest_rate || undefined,
        due_date: initialData.due_date || undefined,
        minimum_payment: initialData.minimum_payment || undefined,
        description: initialData.description || '',
        status: initialData.status,
      });
      // Set display values
      setLimitAmountDisplay(formatInputNumber(initialData.limit_amount));
      setAvailableLimitDisplay(formatInputNumber(initialData.available_limit || ''));
      setUsedAmountDisplay(formatInputNumber(initialData.used_amount));
      setDebtAmountDisplay(formatInputNumber(initialData.debt_amount));
      setInterestRateDisplay(initialData.interest_rate ? initialData.interest_rate.toString() : '');
      setMinimumPaymentDisplay(formatInputNumber(initialData.minimum_payment || ''));
    } else {
      form.reset({
        debt_name: '',
        debt_type: '',
        bank_name: '',
        limit_amount: 0,
        available_limit: undefined,
        used_amount: 0,
        debt_amount: 0,
        interest_rate: undefined,
        due_date: undefined,
        minimum_payment: undefined,
        description: '',
        status: 'active',
      });
      // Reset display values
      setLimitAmountDisplay('');
      setAvailableLimitDisplay('');
      setUsedAmountDisplay('');
      setDebtAmountDisplay('');
      setInterestRateDisplay('');
      setMinimumPaymentDisplay('');
    }
  }, [initialData, isOpen]);

  const limitAmount = form.watch('limit_amount');
  const availableLimit = form.watch('available_limit');
  const usedAmount = form.watch('used_amount');
  const debtAmount = form.watch('debt_amount');
  const interestRate = form.watch('interest_rate');
  const minimumPayment = form.watch('minimum_payment');

  // Update display values when form values change
  useEffect(() => {
    if (limitAmount !== undefined && limitAmount !== null) {
      setLimitAmountDisplay(formatInputNumber(limitAmount));
    }
  }, [limitAmount]);

  useEffect(() => {
    if (availableLimit !== undefined && availableLimit !== null) {
      setAvailableLimitDisplay(formatInputNumber(availableLimit));
    } else {
      setAvailableLimitDisplay('');
    }
  }, [availableLimit]);

  useEffect(() => {
    if (usedAmount !== undefined && usedAmount !== null) {
      setUsedAmountDisplay(formatInputNumber(usedAmount));
    }
  }, [usedAmount]);

  useEffect(() => {
    if (debtAmount !== undefined && debtAmount !== null) {
      setDebtAmountDisplay(formatInputNumber(debtAmount));
    }
  }, [debtAmount]);

  useEffect(() => {
    if (interestRate !== undefined && interestRate !== null) {
      setInterestRateDisplay(interestRate.toString());
    } else {
      setInterestRateDisplay('');
    }
  }, [interestRate]);

  useEffect(() => {
    if (minimumPayment !== undefined && minimumPayment !== null) {
      setMinimumPaymentDisplay(formatInputNumber(minimumPayment));
    } else {
      setMinimumPaymentDisplay('');
    }
  }, [minimumPayment]);

  // Auto-calculate used_amount when available_limit is provided
  useEffect(() => {
    const limit = limitAmount || 0;
    const available = availableLimit;
    
    if (available !== undefined && available !== null && available > 0 && limit > 0) {
      // If available_limit is provided, calculate used_amount
      const calculatedUsed = limit - available;
      if (calculatedUsed >= 0) {
        form.setValue('used_amount', calculatedUsed, { shouldValidate: true });
      }
    }
  }, [limitAmount, availableLimit, form]);

  // Auto-calculate debt_amount when used_amount changes
  // Hutang = Jumlah Terpakai (bukan limit - terpakai)
  useEffect(() => {
    const used = usedAmount || 0;
    if (used >= 0) {
      form.setValue('debt_amount', used, { shouldValidate: true });
    }
  }, [usedAmount, form]);

  const handleSubmit = async (data: DebtFormData) => {
    // Calculate used_amount if available_limit is provided
    let finalUsedAmount = data.used_amount;
    let finalAvailableLimit = data.available_limit;
    
    if (data.available_limit !== undefined && data.available_limit !== null) {
      finalUsedAmount = data.limit_amount - data.available_limit;
      finalAvailableLimit = data.available_limit;
    } else {
      // If available_limit not provided, calculate it from used_amount
      finalAvailableLimit = data.limit_amount - data.used_amount;
    }
    
    // Hutang = Jumlah Terpakai (bukan limit - terpakai)
    const finalDebtAmount = finalUsedAmount;
    
    const success = await onSubmit({
      ...data,
      used_amount: finalUsedAmount,
      available_limit: finalAvailableLimit,
      debt_amount: finalDebtAmount,
    });
    
    if (success) {
      form.reset();
      onClose();
    }
  };

  const selectedDueDate = form.watch('due_date') 
    ? new Date(form.watch('due_date')!) 
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[600px] sm:h-[600px] max-w-[600px] max-h-[90vh] p-0 overflow-hidden flex flex-col min-w-0">
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
          <DialogTitle className="text-lg font-semibold">
            {isEditMode ? 'Edit Hutang' : 'Tambah Hutang Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Perbarui informasi hutang Anda' 
              : 'Masukkan detail hutang yang ingin ditambahkan'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll px-4 py-4 space-y-4">
            <div>
              <Label htmlFor="debt_name">
                Nama Hutang <span className="text-red-500">*</span>
              </Label>
              <Input
                id="debt_name"
                {...form.register('debt_name')}
                placeholder="Contoh: Kartu Kredit Jenius"
                className="mt-1"
              />
              {form.formState.errors.debt_name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.debt_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="debt_type">
                Tipe Hutang <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('debt_type')}
                onValueChange={(value) => form.setValue('debt_type', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih tipe hutang" />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.debt_type && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.debt_type.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="bank_name">Bank/Institusi</Label>
              <Input
                id="bank_name"
                {...form.register('bank_name')}
                placeholder="Contoh: Jenius, BCA, Mandiri"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="limit_amount">
                  Limit/Plafon (Rp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="limit_amount"
                  type="text"
                  value={limitAmountDisplay}
                  onChange={(e) => {
                    const formatted = formatInputNumber(e.target.value);
                    setLimitAmountDisplay(formatted);
                    const parsed = parseInputNumber(formatted);
                    form.setValue('limit_amount', parsed, { shouldValidate: true });
                  }}
                  placeholder="0"
                  className="mt-1"
                />
                {form.formState.errors.limit_amount && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.limit_amount.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="available_limit">
                  Limit Tersedia (Rp)
                </Label>
                <Input
                  id="available_limit"
                  type="text"
                  value={availableLimitDisplay}
                  onChange={(e) => {
                    const formatted = formatInputNumber(e.target.value);
                    setAvailableLimitDisplay(formatted);
                    const parsed = parseInputNumber(formatted);
                    form.setValue('available_limit', parsed || undefined, { shouldValidate: true });
                  }}
                  placeholder="0"
                  className="mt-1"
                />
                {form.formState.errors.available_limit && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.available_limit.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Jika diisi, Jumlah Terpakai akan dihitung otomatis
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="used_amount">
                Jumlah Terpakai (Rp) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="used_amount"
                type="text"
                value={usedAmountDisplay}
                onChange={(e) => {
                  const formatted = formatInputNumber(e.target.value);
                  setUsedAmountDisplay(formatted);
                  const parsed = parseInputNumber(formatted);
                  form.setValue('used_amount', parsed, { shouldValidate: true });
                }}
                placeholder="0"
                className="mt-1"
                readOnly={!!availableLimit && availableLimit !== null && availableLimit !== undefined}
              />
              {form.formState.errors.used_amount && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.used_amount.message}
                </p>
              )}
              {availableLimit !== undefined && availableLimit !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Otomatis dihitung: Limit - Limit Tersedia
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="debt_amount">
                Hutang Aktual (Rp) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="debt_amount"
                type="text"
                value={debtAmountDisplay}
                placeholder="0"
                className="mt-1"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Otomatis dihitung: Sama dengan Jumlah Terpakai
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="interest_rate">Bunga per Tahun (%)</Label>
                <Input
                  id="interest_rate"
                  type="text"
                  value={interestRateDisplay}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                    setInterestRateDisplay(value);
                    const parsed = parseFloat(value) || undefined;
                    form.setValue('interest_rate', parsed, { shouldValidate: true });
                  }}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="minimum_payment">Minimum Payment (Rp)</Label>
                <Input
                  id="minimum_payment"
                  type="text"
                  value={minimumPaymentDisplay}
                  onChange={(e) => {
                    const formatted = formatInputNumber(e.target.value);
                    setMinimumPaymentDisplay(formatted);
                    const parsed = parseInputNumber(formatted);
                    form.setValue('minimum_payment', parsed || undefined, { shouldValidate: true });
                  }}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="due_date">Jatuh Tempo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !selectedDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDueDate ? format(selectedDueDate, "dd/MM/yyyy") : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDueDate}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue('due_date', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value: 'active' | 'paid_off' | 'closed') => 
                  form.setValue('status', value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="paid_off">Lunas</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Catatan tambahan tentang hutang ini..."
                className="mt-1 min-h-[80px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-3 p-4 border-t flex-shrink-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : isEditMode ? 'Perbarui' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
