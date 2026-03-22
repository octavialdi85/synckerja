import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Input } from '@/features/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useIsMobile } from '@/mobile/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatToRupiah } from '@/utils/formatCurrency';
import { formatInputNumber, parseInputNumber } from '@/features/8_2_pricing-tools/utils/pricingUtils';
import type { BankAccount } from '@/hooks/organized/useBankAccounts';
import { useCreateBankTransfer } from '@/hooks/organized/useCreateBankTransfer';

export interface BankTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAccount: BankAccount | null;
  destinationAccounts: BankAccount[];
  sourceBalance: number;
}

type Step = 1 | 2 | 3;

export function BankTransferDialog({
  open,
  onOpenChange,
  sourceAccount,
  destinationAccounts,
  sourceBalance,
}: BankTransferDialogProps) {
  const { t } = useAppTranslation();
  const isMobile = useIsMobile();
  const { mutateAsync, isPending } = useCreateBankTransfer();
  const confirmLockRef = useRef(false);

  const [step, setStep] = useState<Step>(1);
  const [toId, setToId] = useState<string>('');
  const [amountStr, setAmountStr] = useState('');
  const [feeStr, setFeeStr] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      confirmLockRef.current = false;
      setStep(1);
      setToId('');
      setAmountStr('');
      setFeeStr('');
      setNote('');
    }
  }, [open]);

  const amountNum = useMemo(() => parseInputNumber(amountStr || '0'), [amountStr]);
  const feeNum = useMemo(() => parseInputNumber(feeStr || '0'), [feeStr]);
  const totalOut = amountNum + feeNum;

  const dest = destinationAccounts.find((a) => a.id === toId);

  const validationError = useMemo(() => {
    if (step === 1 && !toId) {
      return t('incomes.bankTransfer.validation.destination', 'Select a destination account.');
    }
    if (step === 2) {
      if (!(amountNum > 0)) {
        return t('incomes.bankTransfer.validation.amount', 'Enter an amount greater than zero.');
      }
      if (feeNum < 0) {
        return t('incomes.bankTransfer.validation.fee', 'Fee cannot be negative.');
      }
      if (totalOut > sourceBalance + 1e-6) {
        return t(
          'incomes.bankTransfer.validation.insufficient',
          'Balance is not enough for this amount and fee.'
        );
      }
    }
    return null;
  }, [step, toId, amountNum, feeNum, totalOut, sourceBalance, t]);

  const handleNext = () => {
    if (validationError) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleConfirm = async () => {
    if (confirmLockRef.current || isPending) return;
    if (!sourceAccount || !toId || !(amountNum > 0) || feeNum < 0 || totalOut > sourceBalance + 1e-6) {
      return;
    }
    confirmLockRef.current = true;
    try {
      await mutateAsync({
        fromBankAccountId: sourceAccount.id,
        toBankAccountId: toId,
        amount: amountNum,
        fee: feeNum,
        note: note.trim() || null,
      });
      onOpenChange(false);
    } catch {
      /* toast in hook */
    } finally {
      confirmLockRef.current = false;
    }
  };

  const stepTitle =
    step === 1
      ? t('incomes.bankTransfer.stepDestination', 'Destination account')
      : step === 2
        ? t('incomes.bankTransfer.stepAmount', 'Amount & fee')
        : t('incomes.bankTransfer.stepConfirm', 'Confirm');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 flex flex-col gap-0',
          isMobile
            ? 'fixed left-0 right-0 top-0 translate-x-0 translate-y-0 w-full max-w-none max-h-none rounded-none modal-above-safe-area z-30'
            : 'max-w-md max-h-[90vh]'
        )}
        overlayClassName={isMobile ? 'z-30' : undefined}
        hideCloseButton={isMobile}
        fullscreenAnimation={isMobile}
      >
        <DialogHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-left safe-area-top px-4 pt-4 pb-3">
          <DialogTitle className="text-lg font-semibold">
            {t('incomes.bankTransfer.title', 'Transfer between accounts')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {stepTitle}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 seamless-scroll"
          style={{
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {sourceAccount ? (
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">
                {t('incomes.bankTransfer.from', 'From')}:
              </span>{' '}
              {sourceAccount.name}
              {sourceAccount.account_number ? ` · ${sourceAccount.account_number}` : ''}
              <span className="block mt-1">
                {t('incomes.bankAccount', 'Bank account')}:{' '}
                <span className="font-medium tabular-nums">{formatToRupiah(sourceBalance)}</span>
              </span>
            </p>
          ) : null}

          {step === 1 && (
            <div className="space-y-2">
              <Label>{t('incomes.bankTransfer.to', 'To')}</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('incomes.bankTransfer.selectDestination', 'Select destination account')} />
                </SelectTrigger>
                <SelectContent>
                  {destinationAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.account_number ? ` · ${a.account_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bt-amount">{t('incomes.bankTransfer.amountLabel', 'Amount credited to destination (IDR)')}</Label>
                <Input
                  id="bt-amount"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = parseInputNumber(raw);
                    setAmountStr(Number.isFinite(n) && n >= 0 ? formatInputNumber(String(Math.floor(n))) : raw);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bt-fee">{t('incomes.bankTransfer.feeLabel', 'Admin / transfer fee (IDR)')}</Label>
                <Input
                  id="bt-fee"
                  inputMode="numeric"
                  value={feeStr}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = parseInputNumber(raw);
                    setFeeStr(Number.isFinite(n) && n >= 0 ? formatInputNumber(String(Math.floor(n))) : raw);
                  }}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    'incomes.bankTransfer.feeHint',
                    'The fee only reduces the source balance; it is not credited to the destination.'
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bt-note">{t('incomes.bankTransfer.noteOptional', 'Note (optional)')}</Label>
                <Textarea
                  id="bt-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {step === 3 && dest && sourceAccount && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('incomes.bankTransfer.to', 'To')}</span>
                  <span className="font-medium text-right">{dest.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t('incomes.bankTransfer.creditedToDestination', 'Credited to destination')}
                  </span>
                  <span className="font-semibold tabular-nums">{formatToRupiah(amountNum)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('incomes.bankTransfer.feeLabel', 'Admin / transfer fee (IDR)')}</span>
                  <span className="tabular-nums">{formatToRupiah(feeNum)}</span>
                </div>
                <div className="flex justify-between gap-2 border-t pt-2 mt-2">
                  <span className="text-muted-foreground">
                    {t('incomes.bankTransfer.totalDebit', 'Total debited from source')}
                  </span>
                  <span className="font-semibold tabular-nums">{formatToRupiah(totalOut)}</span>
                </div>
              </div>
            </div>
          )}

          {validationError && (step === 1 || step === 2) ? (
            <p className="text-sm text-destructive mt-3">{validationError}</p>
          ) : null}
        </div>

        <DialogFooter className="flex-shrink-0 border-t bg-muted/30 px-4 pt-3 pb-3 gap-2 sm:justify-between">
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || step === 1}
              onClick={handleBack}
            >
              {t('incomes.bankTransfer.back', 'Back')}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              {step < 3 ? (
                <Button type="button" size="sm" disabled={!!validationError || isPending} onClick={handleNext}>
                  {t('incomes.bankTransfer.next', 'Next')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="min-w-[120px]"
                  disabled={isPending || totalOut > sourceBalance + 1e-6}
                  onClick={handleConfirm}
                >
                  {isPending
                    ? t('incomes.bankTransfer.submitting', 'Processing…')
                    : t('incomes.bankTransfer.confirm', 'Confirm transfer')}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
