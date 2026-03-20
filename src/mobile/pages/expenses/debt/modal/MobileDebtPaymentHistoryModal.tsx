import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/mobile/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/features/ui/dialog";
import { Button } from "@/features/ui/button";
import { Debt } from "@/features/4_2_debt/types";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { formatToRupiah } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { useDebtPayments, DebtPaymentRecord } from "@/features/4_2_debt/hooks/useDebtPayments";
import { Calendar, CreditCard, Loader2, Receipt, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDebtPaymentHistoryModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDebtPaymentHistoryModal({
  debt,
  isOpen,
  onClose,
}: MobileDebtPaymentHistoryModalProps) {
  const { t } = useAppTranslation();
  const isMobile = useIsMobile();
  const debtId = debt?.id ?? null;
  const { payments, isLoading, refetch } = useDebtPayments(debtId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const pullDistanceRef = useRef(0);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 52;
  const MAX_PULL = 72;
  const INDICATOR_HEIGHT = 56;
  const PULL_RESISTANCE = 0.55;

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  const handlePullRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refetch]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    const el = listScrollRef.current;
    if (el?.scrollTop <= 2) setIsPulling(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const el = listScrollRef.current;
    if (!el || isRefreshing) return;
    if (el.scrollTop > 2) {
      setIsPulling(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
      return;
    }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      const d = Math.min(delta * PULL_RESISTANCE, MAX_PULL);
      setPullDistance(d);
      pullDistanceRef.current = d;
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [isRefreshing]);

  const onTouchEnd = useCallback(() => {
    setIsPulling(false);
    const d = pullDistanceRef.current;
    setPullDistance(0);
    pullDistanceRef.current = 0;
    if (d >= PULL_THRESHOLD) {
      handlePullRefresh();
    }
  }, [handlePullRefresh, PULL_THRESHOLD]);

  if (!debt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          isMobile
            ? "fixed left-0 right-0 top-0 translate-x-0 translate-y-0 w-full max-w-none max-h-none rounded-none modal-above-safe-area flex flex-col p-0 gap-0 overflow-hidden"
            : "w-[min(92vw,420px)] aspect-square max-h-[92vw] sm:max-h-[420px] flex flex-col p-0 overflow-hidden min-w-0"
        )}
        fullscreenAnimation={isMobile}
      >
        <DialogHeader
          className={cn(
            "flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-left",
            isMobile ? "safe-area-top px-4 pt-4 pb-3" : "px-4 pt-4 pb-3"
          )}
        >
          <DialogTitle className="text-lg font-semibold">
            {t("debt.paymentHistory.title", "Payment History")} - {debt.debt_name}
          </DialogTitle>
          <DialogDescription>
            {t("debt.paymentHistory.description", "Payment history for this debt.")}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={listScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll px-2 py-2"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground text-sm"
            style={{
              height: pullDistance > 0 ? Math.min(pullDistance, MAX_PULL) : isRefreshing ? INDICATOR_HEIGHT : 0,
              minHeight: 0,
              transition: isPulling
                ? "none"
                : "height 0.35s ease-in-out, min-height 0.35s ease-in-out",
            }}
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" aria-hidden />
            ) : pullDistance >= PULL_THRESHOLD ? (
              <span className="text-xs font-medium text-primary whitespace-nowrap">
                {t("common.pullToRefresh.release", "Lepas untuk refresh")}
              </span>
            ) : (
              <RefreshCw
                className="h-5 w-5 opacity-80 shrink-0"
                style={{
                  transform: `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 180, 180)}deg)`,
                  transition: isPulling ? "none" : "transform 0.2s ease-in-out",
                }}
                aria-hidden
              />
            )}
          </div>

          {isLoading && !isRefreshing ? (
            <div className="py-6 flex justify-center">
              <div className="animate-pulse text-sm text-gray-500">
                {t("debt.paymentHistory.loading", "Loading...")}
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {t("debt.paymentHistory.noPayments", "No payment history yet.")}
            </div>
          ) : (
            <div className="space-y-1">
              {payments.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} t={t} />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pt-3 pb-3 flex-shrink-0 border-t bg-muted/30">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("debt.form.cancel", "Cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/50 hover:bg-gray-50">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-900">
            {format(new Date(payment.payment_date), "dd MMM yyyy")}
          </span>
        </div>
        <span className="font-semibold text-blue-600">
          {formatToRupiah(payment.payment_amount)}
        </span>
      </div>

      {(hasPrincipal || hasInterest) && (
        <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-gray-600">
          {hasPrincipal ? (
            <span>
              {t("debt.paymentHistory.principal", "Principal")}: {formatToRupiah(payment.principal_amount!)}
            </span>
          ) : null}
          {hasInterest ? (
            <span>
              {t("debt.paymentHistory.interest", "Interest")}: {formatToRupiah(payment.interest_amount!)}
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-1.5 flex gap-2 text-xs text-gray-600">
        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          {t("debt.payment.method", "Payment Method")}: {payment.bank_account_name ?? t("debt.paymentHistory.notSelected", "-")}
        </span>
      </div>

      <div className="mt-1.5 flex gap-2 text-xs text-gray-500">
        <Receipt className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span className="break-words">
          {t("debt.payment.notes", "Notes")}: {payment.notes?.trim() ? payment.notes : t("debt.paymentHistory.notSelected", "-")}
        </span>
      </div>
    </div>
  );
}
