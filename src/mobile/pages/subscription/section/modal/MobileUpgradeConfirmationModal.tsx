import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/mobile/components/ui/dialog";
import { Button } from "@/mobile/components/ui/button";
import { Badge } from "@/mobile/components/ui/badge";
import { Separator } from "@/mobile/components/ui/separator";
import { formatIDR } from "@/features/1-login/utils/subscriptionUtils";
import type { SubscriptionPlan } from "@/features/10-management/hooks/useOptimizedSubscription";
import { cn } from "@/lib/utils";

interface ProRatedData {
  current_plan: {
    name: string;
    member_count: number;
    base_price_per_member: number;
    billing_cycle: string;
    end_date: string;
  };
  target_plan: {
    name: string;
    base_price_per_member: number;
  };
  calculation: {
    new_member_count: number;
    member_difference: number;
    remaining_days: number;
    total_days: number;
    prorate_percentage: number;
    prorate_amount: number;
    plan_change_charge: number;
    member_change_charge: number;
    is_upgrade: boolean;
    is_plan_change: boolean;
    charge_now: boolean;
    change_type: string;
    scheduled_date: string;
  };
}

interface MobileUpgradeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  subscriptionStatus: any;
  billingCycle: "monthly" | "yearly";
  currentMemberCount: number;
  newMemberCount: number;
  proRatedData?: ProRatedData;
  isLoading?: boolean;
}

export const MobileUpgradeConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  currentPlan,
  newPlan,
  subscriptionStatus,
  billingCycle,
  currentMemberCount,
  newMemberCount,
  proRatedData,
  isLoading,
}: MobileUpgradeConfirmationModalProps) => {
  const isYearly = billingCycle === "yearly";
  const calculation = proRatedData?.calculation;
  const isScheduled = calculation && !calculation.charge_now;
  const isImmediateCharge = calculation?.charge_now;
  const totalAmount = isYearly
    ? newPlan.base_price_per_member * newMemberCount * 12 * (1 - (newPlan.annual_discount_percentage || 0) / 100)
    : newPlan.base_price_per_member * newMemberCount;

  const summaryLine = `${newPlan.name} • ${newMemberCount} member • ${billingCycle === "yearly" ? "Tahunan" : "Bulanan"}`;

  const renderProrateInfo = () => {
    if (!calculation) {
      return (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Tidak ada biaya tambahan. Perubahan akan diproses setelah Anda konfirmasi.
        </div>
      );
    }

    if (isScheduled) {
      return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
          <h4 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-orange-800">
            Perubahan dijadwalkan
            <Badge variant="secondary" className="bg-white text-orange-700">
              {new Date(calculation.scheduled_date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Badge>
          </h4>
          <ul className="space-y-1 text-xs">
            <li>Sisa hari periode berjalan: {calculation.remaining_days} hari</li>
            <li>Perubahan akan diterapkan di akhir periode saat ini</li>
          </ul>
          <p className="mt-2 rounded-lg bg-white/70 p-2 text-[11px] text-orange-700">
            Tidak ada biaya tambahan. Sistem akan otomatis menerapkan perubahan.
          </p>
        </div>
      );
    }

    if (isImmediateCharge) {
      return (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total biaya prorate</span>
            <span>{formatIDR(calculation.prorate_amount)}</span>
          </div>
          <ul className="space-y-1 text-xs text-primary/80">
            <li>Sisa hari subscription: {calculation.remaining_days} hari</li>
            <li>Persentase prorate: {calculation.prorate_percentage.toFixed(1)}%</li>
            {calculation.plan_change_charge > 0 && (
              <li>Biaya perubahan plan: {formatIDR(calculation.plan_change_charge)}</li>
            )}
            {calculation.member_change_charge > 0 && (
              <li>Biaya tambahan member: {formatIDR(calculation.member_change_charge)}</li>
            )}
          </ul>
          <p className="rounded-lg bg-primary/10 p-2 text-[11px] text-primary-foreground/80">
            Anda hanya akan membayar sesuai sisa periode subscription saat ini.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "fixed inset-x-0 bottom-0 top-auto z-50 flex h-[92vh] max-h-[92vh] w-full translate-x-0 translate-y-0 flex-col rounded-t-3xl border border-border bg-background p-0 shadow-lg",
          "sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
        )}
      >
        <DialogHeader className="px-6 pb-3 pt-6 text-left">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {isScheduled
              ? "Jadwalkan Perubahan Plan"
              : isImmediateCharge
                ? "Konfirmasi Pembayaran Prorate"
                : "Konfirmasi Upgrade"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pastikan detail di bawah sudah sesuai sebelum melanjutkan ke pembayaran.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ringkasan perubahan
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Plan saat ini</span>
                  <span className="font-medium text-foreground">{currentPlan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Plan baru</span>
                  <span className="font-medium text-primary">{newPlan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Member</span>
                  <span className="font-medium text-foreground">
                    {currentMemberCount} → {newMemberCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pembayaran</span>
                  <span className="font-medium text-foreground">
                    {billingCycle === "yearly" ? "Tahunan" : "Bulanan"}
                  </span>
                </div>
              </div>
            </div>

            {renderProrateInfo()}

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total pembayaran
              </h4>
              <div className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>{isScheduled ? "Biaya tambahan" : "Total dibayarkan"}</span>
                <span>{isScheduled ? formatIDR(0) : formatIDR(totalAmount)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isScheduled
                  ? "Tidak ada biaya tambahan. Perubahan akan berlaku otomatis pada akhir periode."
                  : "Pembayaran akan diproses melalui Midtrans dan aktif setelah konfirmasi."}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 border-t border-border bg-background px-6 pb-6 pt-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
              <span>Ringkasan</span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {summaryLine}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-full text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              className={cn(
                "h-12 rounded-full text-sm font-semibold text-white",
                isScheduled ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90",
              )}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : isScheduled ? "Jadwalkan Perubahan" : "Konfirmasi & Bayar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

