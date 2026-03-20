import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Debt } from '../types';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { formatToRupiah } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { useDebtPayments, DebtPaymentRecord } from '../hooks/useDebtPayments';
import { Calendar, Receipt, CreditCard } from 'lucide-react';

interface DebtPaymentHistoryModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DebtPaymentHistoryModal = ({
  debt,
  isOpen,
  onClose,
}: DebtPaymentHistoryModalProps) => {
  const { t } = useAppTranslation();
  const debtId = debt?.id ?? null;
  const { payments, isLoading } = useDebtPayments(debtId);

  if (!debt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(92vw,420px)] aspect-square max-h-[92vw] sm:max-h-[420px] flex flex-col p-0 overflow-hidden min-w-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('debt.paymentHistory.title', 'Payment History')} — {debt.debt_name}
          </DialogTitle>
          <DialogDescription>
            {t('debt.paymentHistory.description', 'Riwayat pembayaran untuk hutang ini.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4">
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="animate-pulse text-sm text-gray-500">
                {t('debt.paymentHistory.loading', 'Loading...')}
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {t('debt.paymentHistory.noPayments', 'Belum ada riwayat pembayaran.')}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll py-2 space-y-2">
              {payments.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} t={t} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('debt.form.cancel', 'Cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function PaymentHistoryItem({
  payment,
  t,
}: {
  payment: DebtPaymentRecord;
  t: (key: string, fallback?: string) => string;
}) {
  const hasPrincipal = payment.principal_amount != null && payment.principal_amount > 0;
  const hasInterest = payment.interest_amount != null && payment.interest_amount > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 hover:bg-gray-50">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-900">
            {format(new Date(payment.payment_date), 'dd MMM yyyy')}
          </span>
        </div>
        <span className="font-semibold text-blue-600">
          {formatToRupiah(payment.payment_amount)}
        </span>
      </div>
      {(hasPrincipal || hasInterest) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
          {hasPrincipal && (
            <span>
              {t('debt.paymentHistory.principal', 'Pokok')}: {formatToRupiah(payment.principal_amount!)}
            </span>
          )}
          {hasInterest && (
            <span>
              {t('debt.paymentHistory.interest', 'Bunga')}: {formatToRupiah(payment.interest_amount!)}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex gap-2 text-xs text-gray-600">
        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          {t('debt.payment.method', 'Payment Method')}: {payment.bank_account_name ?? t('debt.paymentHistory.notSelected', '—')}
        </span>
      </div>
      <div className="mt-2 flex gap-2 text-xs text-gray-500">
        <Receipt className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span className="break-words">
          {t('debt.payment.notes', 'Notes')}: {payment.notes?.trim() ? payment.notes : t('debt.paymentHistory.notSelected', '—')}
        </span>
      </div>
    </div>
  );
}
