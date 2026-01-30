import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Debt } from '../types';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { formatInputNumber, parseInputNumber } from '../utils/numberFormat';
import { formatToRupiah } from '@/utils/formatCurrency';
import { useBankAccounts } from '@/hooks/organized/useBankAccounts';
import { useBankAccountBalances } from '@/hooks/organized/useBankAccountBalances';
import { toast } from 'sonner';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: {
    debtId: string;
    paymentAmount: number;
    paymentDate: string;
    paymentMethod?: string;
    notes?: string;
  }) => Promise<boolean>;
  debts: Debt[];
  isLoading?: boolean;
}

export const DebtPaymentModal = ({
  isOpen,
  onClose,
  onSubmit,
  debts,
  isLoading = false
}: DebtPaymentModalProps) => {
  const { t } = useAppTranslation();
  const { bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts();
  const { balances, isLoading: balancesLoading } = useBankAccountBalances();
  const [selectedDebtId, setSelectedDebtId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Filter debts that have remaining balance to pay OR interest to pay, and are active
  const payableDebts = debts.filter(debt => {
    if (debt.status !== 'active') return false;
    // Ambil dari kolom remaining_debt di table debts; fallback ke debt_amount - paid_amount
    // Jika remaining_debt = 0 tapi fallback > 0 (data stale), pakai fallback agar debt tetap muncul (mis. Tunaiku)
    const fallback = Math.max(0, debt.debt_amount - (debt.paid_amount ?? 0));
    const remainingToPay = (debt.remaining_debt != null && debt.remaining_debt !== undefined)
      ? (debt.remaining_debt > 0 ? debt.remaining_debt : (fallback > 0 ? fallback : 0))
      : fallback;
    
    // Tampilkan jika ada sisa pokok ATAU ada bunga yang belum dibayar (untuk Pinjaman Online yang sudah lunas pokok tapi masih ada bunga)
    const hasInterest = (debt.total_interest ?? 0) > 0;
    return remainingToPay > 0 || hasInterest;
  });

  // Get selected debt object
  const selectedDebt = payableDebts.find(d => d.id === selectedDebtId) || null;

  // Saldo rekening yang dipilih (untuk validasi)
  const selectedAccountBalance = paymentMethod
    ? (balances.find(b => b.bank_account_id === paymentMethod)?.balance ?? 0)
    : null;
  const insufficientBalance =
    paymentMethod != null &&
    paymentMethod !== '' &&
    selectedAccountBalance != null &&
    paymentAmount > 0 &&
    selectedAccountBalance < paymentAmount;

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens (only on initial open, not when payableDebts changes)
      const firstPayableDebt = payableDebts.length > 0 ? payableDebts[0] : null;
      if (firstPayableDebt && !selectedDebtId) {
        console.log('🔵 [DebtPaymentModal] Initializing selectedDebtId to first payable debt:', firstPayableDebt.id);
        setSelectedDebtId(firstPayableDebt.id);
      } else if (!firstPayableDebt) {
        console.log('🔵 [DebtPaymentModal] No payable debts, clearing selectedDebtId');
        setSelectedDebtId('');
      }
      setPaymentAmountDisplay('');
      setPaymentAmount(0);
      setPaymentDate(new Date());
      setPaymentMethod('');
      setNotes('');
    }
  }, [isOpen]); // Removed payableDebts from dependency to prevent reset on selection

  // Reset form when selected debt changes
  useEffect(() => {
    console.log('🔵 [DebtPaymentModal] selectedDebtId changed to:', selectedDebtId);
    if (selectedDebtId) {
      setPaymentAmountDisplay('');
      setPaymentAmount(0);
    }
  }, [selectedDebtId]);

  const handleSubmit = async () => {
    if (!selectedDebt || !paymentAmount || paymentAmount <= 0) {
      return;
    }

    // Tolak jika metode pembayaran dipilih tapi saldo tidak mencukupi
    if (insufficientBalance) {
      toast.error(
        t('debt.payment.insufficientBalance', 'Saldo metode pembayaran tidak mencukupi untuk jumlah pembayaran.')
      );
      return;
    }

    // Konfirmasi khusus jika pokok sudah lunas (remaining_debt = 0) tapi masih bayar (kemungkinan bayar bunga)
    const remainingDebt = calculateRemainingDebt();
    if (remainingDebt === 0) {
      const confirmed = window.confirm(
        t('debt.payment.confirmInterestOnly', 
          'The principal debt is already paid off (Rp 0). This payment will be recorded as interest payment only. Continue?') ||
        'Pokok pinjaman sudah lunas (Rp 0). Pembayaran ini akan dicatat sebagai pembayaran bunga saja. Lanjutkan?'
      );
      if (!confirmed) {
        return;
      }
    }

    // Payment amount can exceed remaining debt (e.g. payment includes interest)
    const paymentData = {
      debtId: selectedDebt.id,
      paymentAmount,
      paymentDate: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: paymentMethod || undefined,
      notes: notes || undefined,
    };

    const success = await onSubmit(paymentData);
    if (success) {
      onClose();
    }
  };

  const calculateRemainingDebt = () => {
    if (!selectedDebt) return 0;
    // Ambil dari kolom remaining_debt di table debts; fallback ke debt_amount - paid_amount (termasuk saat remaining_debt = 0 tapi masih ada sisa)
    const fallback = Math.max(0, selectedDebt.debt_amount - (selectedDebt.paid_amount ?? 0));
    return (selectedDebt.remaining_debt != null && selectedDebt.remaining_debt !== undefined)
      ? (selectedDebt.remaining_debt > 0 ? selectedDebt.remaining_debt : (fallback > 0 ? fallback : 0))
      : fallback;
  };

  const remainingDebt = calculateRemainingDebt();

  // Helper function to format bank account display with balance
  const formatBankAccountDisplay = (account: { id: string; name: string; account_number: string | null }) => {
    // Find balance for this bank account
    const balance = balances.find(b => b.bank_account_id === account.id);
    const balanceAmount = balance?.balance ?? 0;
    const balanceText = formatToRupiah(balanceAmount);
    
    // Format: "Bank Name - Account Number (Balance: Rp X)"
    if (account.account_number) {
      return `${account.name} - ${account.account_number} (Balance: ${balanceText})`;
    }
    return `${account.name} (Balance: ${balanceText})`;
  };

  if (payableDebts.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:w-[500px] max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t('debt.payment.title', 'Pay Debt')}
            </DialogTitle>
            <DialogDescription>
              {t('debt.payment.noPayableDebts', 'No debts available for payment')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('debt.form.cancel', 'Cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[95vw] sm:w-[500px] sm:h-[500px] max-w-[500px] max-h-[500px] p-0 overflow-hidden flex flex-col min-w-0"
        onInteractOutside={(e) => {
          console.log('🔵 [DebtPaymentModal] Dialog onInteractOutside triggered');
          const target = e.target as HTMLElement;
          const isSelectContent = target.closest('[data-radix-select-content]');
          const isSelectTrigger = target.closest('[data-radix-select-trigger]');
          
          if (isSelectContent || isSelectTrigger) {
            console.log('🔵 [DebtPaymentModal] Click on Select, preventing dialog close');
            e.preventDefault();
          } else {
            console.log('🔵 [DebtPaymentModal] Click outside Select, allowing dialog close');
          }
        }}
        onPointerDownOutside={(e) => {
          console.log('🔵 [DebtPaymentModal] Dialog onPointerDownOutside triggered');
          const target = e.target as HTMLElement;
          const isSelectContent = target.closest('[data-radix-select-content]');
          const isSelectTrigger = target.closest('[data-radix-select-trigger]');
          
          if (isSelectContent || isSelectTrigger) {
            console.log('🔵 [DebtPaymentModal] Pointer down on Select, preventing dialog close');
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('debt.payment.title', 'Pay Debt')}
          </DialogTitle>
          <DialogDescription>
            {t('debt.payment.description', 'Record a payment for this debt')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll px-4 py-4 space-y-4">
          {/* Debt Selection */}
          <div>
            <Label htmlFor="debt_select">
              {t('debt.payment.selectDebt', 'Select Debt')} <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={selectedDebtId} 
              onValueChange={(value) => {
                console.log('🔵 [DebtPaymentModal] onValueChange triggered with value:', value);
                console.log('🔵 [DebtPaymentModal] Current selectedDebtId:', selectedDebtId);
                console.log('🔵 [DebtPaymentModal] Available payable debts:', payableDebts.map(d => ({ id: d.id, name: d.debt_name })));
                console.log('🔵 [DebtPaymentModal] Available IDs:', payableDebts.map(d => d.id));
                
                if (!value) {
                  console.error('❌ [DebtPaymentModal] Value is empty/null/undefined');
                  return;
                }
                
                const debtExists = payableDebts.some(d => d.id === value);
                console.log('🔵 [DebtPaymentModal] Debt exists check:', debtExists);
                console.log('🔵 [DebtPaymentModal] Value to check:', value, 'Type:', typeof value);
                console.log('🔵 [DebtPaymentModal] PayableDebts IDs:', payableDebts.map(d => ({ id: d.id, type: typeof d.id, name: d.debt_name })));
                
                // Check if value exists in all debts (not just payableDebts)
                const allDebtsMatch = debts.find(d => d.id === value);
                console.log('🔵 [DebtPaymentModal] Value exists in all debts:', !!allDebtsMatch);
                if (allDebtsMatch) {
                  console.log('🔵 [DebtPaymentModal] Found debt in all debts:', {
                    id: allDebtsMatch.id,
                    name: allDebtsMatch.debt_name,
                    status: allDebtsMatch.status,
                    debt_type: allDebtsMatch.debt_type,
                    debt_amount: allDebtsMatch.debt_amount,
                    paid_amount: allDebtsMatch.paid_amount,
                    available_limit: allDebtsMatch.available_limit
                  });
                }
                
                if (!debtExists) {
                  console.error('❌ [DebtPaymentModal] Selected debt ID not found in payableDebts:', value);
                  console.error('❌ [DebtPaymentModal] This means the debt was filtered out by payableDebts filter');
                  console.error('❌ [DebtPaymentModal] Check the filtering logic above to see why this debt was excluded');
                  // Still set it anyway - maybe the filter is wrong or needs adjustment
                  console.warn('⚠️ [DebtPaymentModal] Setting anyway despite validation failure - debt exists in all debts');
                  console.log('🔵 [DebtPaymentModal] About to call setSelectedDebtId with value:', value);
                  setSelectedDebtId(value);
                  console.log('🔵 [DebtPaymentModal] setSelectedDebtId called');
                  return;
                }
                
                console.log('✅ [DebtPaymentModal] Debt exists, setting selectedDebtId to:', value);
                console.log('🔵 [DebtPaymentModal] About to call setSelectedDebtId');
                console.log('🔵 [DebtPaymentModal] Current selectedDebtId before set:', selectedDebtId);
                
                // Force update immediately
                setSelectedDebtId(value);
                console.log('✅ [DebtPaymentModal] setSelectedDebtId called with value:', value);
                
                // Verify the update
                setTimeout(() => {
                  console.log('🔵 [DebtPaymentModal] After setSelectedDebtId, selectedDebtId should be:', value);
                }, 0);
              }}
              onOpenChange={(open) => {
                console.log('🔵 [DebtPaymentModal] Select open state changed:', open);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('debt.payment.selectDebtPlaceholder', 'Select a debt to pay')} />
              </SelectTrigger>
              <SelectContent 
                className="z-[9999]" 
                position="popper"
                style={{ zIndex: 999999 }}
                onPointerDownOutside={(e) => {
                  console.log('🔵 [DebtPaymentModal] SelectContent onPointerDownOutside triggered');
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-radix-select-content]')) {
                    console.log('🔵 [DebtPaymentModal] Click inside SelectContent, preventing default');
                    e.preventDefault();
                  }
                }}
              >
                {payableDebts.map((debt) => {
                  // Ambil dari kolom remaining_debt di table debts; fallback ke debt_amount - paid_amount (termasuk saat remaining_debt = 0 tapi masih ada sisa)
                  const fallback = Math.max(0, debt.debt_amount - (debt.paid_amount ?? 0));
                  const remaining = (debt.remaining_debt != null && debt.remaining_debt !== undefined)
                    ? (debt.remaining_debt > 0 ? debt.remaining_debt : (fallback > 0 ? fallback : 0))
                    : fallback;
                  
                  return (
                    <SelectItem 
                      key={debt.id} 
                      value={debt.id}
                      onSelect={(e) => {
                        console.log('🔵 [DebtPaymentModal] SelectItem onSelect triggered for:', debt.debt_name, 'ID:', debt.id);
                        console.log('🔵 [DebtPaymentModal] Event:', e);
                      }}
                      onClick={(e) => {
                        console.log('🔵 [DebtPaymentModal] SelectItem onClick triggered for:', debt.debt_name, 'ID:', debt.id);
                        console.log('🔵 [DebtPaymentModal] Click event:', e);
                        e.stopPropagation();
                      }}
                    >
                      {debt.debt_name} - {t('debt.payment.remainingDebt', 'Remaining Debt')}: {formatToRupiah(remaining)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Debt Information */}
          {selectedDebt && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('debt.payment.debtName', 'Debt Name')}:</span>
                <span className="text-sm font-semibold">{selectedDebt.debt_name}</span>
              </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('debt.payment.totalDebt', 'Total Debt')}:</span>
              <span className="text-sm font-semibold text-red-600">
                {formatToRupiah(calculateRemainingDebt())}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('debt.payment.remainingDebt', 'Remaining Debt')}:</span>
              <span className="text-sm font-semibold text-orange-600">
                {formatToRupiah(remainingDebt)}
              </span>
            </div>
            </div>
          )}

          {/* Payment Amount */}
          {selectedDebt && (
            <div>
              <Label htmlFor="payment_amount">
                {t('debt.payment.amount', 'Payment Amount (Rp)')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="payment_amount"
                type="text"
                value={paymentAmountDisplay}
                onChange={(e) => {
                  const formatted = formatInputNumber(e.target.value);
                  setPaymentAmountDisplay(formatted);
                  const parsed = parseInputNumber(formatted);
                  setPaymentAmount(parsed || 0);
                }}
                placeholder=""
                className="mt-1"
                disabled={!selectedDebt}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('debt.payment.remainingDebt', 'Remaining Debt')}: {formatToRupiah(remainingDebt)}. {t('debt.payment.interestHint', 'You can enter a higher amount if payment includes interest.')}
              </p>
            </div>
          )}

          {/* Payment Date */}
          <div>
            <Label htmlFor="payment_date">
              {t('debt.payment.date', 'Payment Date')} <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "dd/MM/yyyy") : t('debt.form.selectDate', 'Select date')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="payment_method">
              {t('debt.payment.method', 'Payment Method')}
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('debt.payment.selectMethod', 'Select payment method')}>
                  {paymentMethod && bankAccounts.length > 0 ? (
                    (() => {
                      const selectedAccount = bankAccounts.find(acc => acc.id === paymentMethod);
                      return selectedAccount ? formatBankAccountDisplay(selectedAccount) : '';
                    })()
                  ) : ''}
                </SelectValue>
              </SelectTrigger>
              <SelectContent 
                className="z-[9999]" 
                position="popper"
                style={{ zIndex: 999999 }}
              >
                {bankAccountsLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : bankAccounts && bankAccounts.length > 0 ? (
                  bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {formatBankAccountDisplay(account)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {t('debt.payment.noBankAccounts', 'No bank accounts available')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {insufficientBalance && (
              <p className="text-xs text-red-600 mt-1">
                {t('debt.payment.insufficientBalance', 'Saldo metode pembayaran tidak mencukupi untuk jumlah pembayaran.')} ({t('debt.payment.balance', 'Balance')}: {formatToRupiah(selectedAccountBalance ?? 0)})
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">
              {t('debt.payment.notes', 'Notes')}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('debt.payment.notesPlaceholder', 'Additional notes about this payment...')}
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
            {t('debt.form.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !selectedDebt || !paymentAmount || paymentAmount <= 0 || insufficientBalance}
          >
            {isLoading ? t('debt.form.saving', 'Saving...') : t('debt.payment.submit', 'Record Payment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
