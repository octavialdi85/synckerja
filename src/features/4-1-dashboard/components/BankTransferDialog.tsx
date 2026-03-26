import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
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
import { toast } from 'sonner';
import { CameraModal } from '@/mobile/components/CameraModal';
import { pickReceiptImageFiles } from '@/mobile/utils/pickReceiptFromGallery';
import type { BankAccount } from '@/hooks/organized/useBankAccounts';
import { useCreateBankTransfer } from '@/hooks/organized/useCreateBankTransfer';
import { AlertCircle, Camera, FileText, Upload, X } from 'lucide-react';

export interface BankTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAccount: BankAccount | null;
  destinationAccounts: BankAccount[];
  sourceBalance: number;
}

type Step = 1 | 2 | 3;

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
const RECEIPT_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const RECEIPT_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

function hasAllowedReceiptType(file: File): boolean {
  const type = (file.type ?? '').toLowerCase();
  if (type && RECEIPT_ALLOWED.includes(type)) return true;
  const fileName = file.name.toLowerCase();
  return RECEIPT_ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function getReceiptValidationError(file: File): 'size' | 'type' | null {
  if (file.size > MAX_RECEIPT_SIZE) return 'size';
  if (!hasAllowedReceiptType(file)) return 'type';
  return null;
}

function dataUrlToImageFile(dataUrl: string, fileName: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:(.*?);base64/.exec(meta ?? '');
  const mime = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptCameraOpen, setReceiptCameraOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      confirmLockRef.current = false;
      setStep(1);
      setToId('');
      setAmountStr('');
      setFeeStr('');
      setNote('');
      setReceiptFile(null);
      setReceiptCameraOpen(false);
    }
  }, [open]);

  const amountNum = useMemo(() => parseInputNumber(amountStr || '0'), [amountStr]);
  const feeNum = useMemo(() => parseInputNumber(feeStr || '0'), [feeStr]);
  const totalOut = amountNum + feeNum;

  const dest = destinationAccounts.find((a) => a.id === toId);
  const receiptPreviewUrl = useMemo(
    () => (receiptFile && receiptFile.type.startsWith('image/') ? URL.createObjectURL(receiptFile) : null),
    [receiptFile]
  );

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

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
        receiptFile,
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

  const applyReceiptFile = (file: File) => {
    const validationError = getReceiptValidationError(file);
    if (validationError === 'size') {
      toast.error(t('incomes.bankTransfer.receiptTooLarge', 'File must be less than 10MB'));
      return;
    }
    if (validationError === 'type') {
      toast.error(t('incomes.bankTransfer.receiptInvalidType', 'Only JPG, PNG, WEBP, or PDF are allowed'));
      return;
    }
    setReceiptFile(file);
  };

  const handlePickReceiptFromGallery = async () => {
    try {
      const files = isMobile
        ? await pickReceiptImageFiles({ maxItems: 1, mediaType: 'imageOnly' })
        : [];
      if (!files.length) return;
      applyReceiptFile(files[0]);
    } catch {
      toast.error(t('incomes.bankTransfer.receiptPickFailed', 'Failed to pick receipt file'));
    }
  };

  const handleDesktopFileChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyReceiptFile(file);
    e.currentTarget.value = '';
  };

  const handleTakeReceiptPhoto = () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setReceiptCameraOpen(true);
      return;
    }
    toast.error(t('incomes.bankTransfer.photoCaptureFailed', 'Photo capture failed'));
  };

  const handleReceiptCameraCapture = (imageData: string) => {
    try {
      const file = dataUrlToImageFile(imageData, `transfer_receipt_${Date.now()}.jpg`);
      applyReceiptFile(file);
      toast.success(t('incomes.bankTransfer.receiptPhotoTaken', 'Receipt photo taken'));
    } catch {
      toast.error(t('incomes.bankTransfer.photoCaptureFailed', 'Photo capture failed'));
    }
    setReceiptCameraOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 flex flex-col gap-0',
          isMobile
            ? 'fixed left-0 right-0 top-0 translate-x-0 translate-y-0 w-full max-w-none max-h-none rounded-none modal-above-safe-area z-30'
            : 'max-w-[640px] w-[640px] h-[640px] max-h-[90vh] rounded-sm'
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
              <div className="space-y-2">
                <Label>{t('incomes.bankTransfer.receipt', 'Receipt (optional)')}</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3">
                  {receiptFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {receiptFile.type.startsWith('image/') && receiptPreviewUrl ? (
                          <img src={receiptPreviewUrl} alt="" className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-background flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground truncate">{receiptFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setReceiptFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        {t('incomes.bankTransfer.receiptHint', 'Attach transfer proof (optional).')}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mb-2">
                    {t('incomes.bankTransfer.receiptFormats', 'JPG / PNG / WEBP / PDF, max 10MB')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isMobile ? (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={handleTakeReceiptPhoto}>
                          <Camera className="h-4 w-4 mr-1.5" />
                          {t('incomes.bankTransfer.takePhoto', 'Take photo')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handlePickReceiptFromGallery}>
                          <Upload className="h-4 w-4 mr-1.5" />
                          {t('incomes.bankTransfer.chooseFile', 'Choose file')}
                        </Button>
                      </>
                    ) : (
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleDesktopFileChange}
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1.5" />
                            {t('incomes.bankTransfer.chooseFile', 'Choose file')}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>
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
      <CameraModal
        isOpen={receiptCameraOpen}
        onClose={() => setReceiptCameraOpen(false)}
        onCapture={handleReceiptCameraCapture}
        title={t('incomes.bankTransfer.receiptCameraTitle', 'Transfer receipt photo')}
        facingMode="environment"
      />
    </Dialog>
  );
}
