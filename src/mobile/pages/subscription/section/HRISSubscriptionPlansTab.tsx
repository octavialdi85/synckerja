import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Zap,
  Users,
  Shield,
  Star,
  Check,
  ArrowRight,
  CalendarDays,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useSubscriptionPlans } from "@/features/10-Plans/hooks/useSubscriptionPlans";
import {
  useOptimizedSubscription,
  type SubscriptionPlan,
} from "@/features/10-management/hooks/useOptimizedSubscription";
import { useMidtransPayment } from "@/features/10-Plans/hooks/useMidtransPayment";
import { useProRateCalculation } from "@/features/10-Plans/hooks/useProRateCalculation";
import { useEmployeeCount } from "@/features/share/hooks/useEmployeeCount";
import { usePendingSubscriptionChanges } from "@/features/10-Plans/hooks/usePendingSubscriptionChanges";
import { useCancelScheduledChange } from "@/features/10-Plans/hooks/useCancelScheduledChange";
import { useSchedulePlanChange } from "@/features/10-Plans/hooks/useSchedulePlanChange";
import {
  formatIDR,
  getMonthlyPriceForMembers,
  getYearlyPriceForMembers,
} from "@/features/1-login/utils/subscriptionUtils";
import { toast } from "sonner";
import { Button } from "@/mobile/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { Slider } from "@/mobile/components/ui/slider";
import { Switch } from "@/mobile/components/ui/switch";
import { LoadingDots } from "@/components/LoadingDots";
import { cn } from "@/lib/utils";
import { MobileUpgradeConfirmationModal } from "./modal/MobileUpgradeConfirmationModal";
import { MobileUpgradeOptionsModal } from "./modal/MobileUpgradeOptionsModal";

type BillingCycle = "monthly" | "yearly";

interface PlanMeta {
  plan: SubscriptionPlan;
  maxMembers: number;
  isCurrent: boolean;
  isTrial: boolean;
}

const getEmployeeLimitFromFeatures = (features: string[]) => {
  if (!Array.isArray(features)) return 100;

  for (const feature of features) {
    const patterns = [
      /(\d+)\s*Member\s*Allowed/i,
      /(\d+)\s*(employee\s*limit|karyawan|orang|employees?|members?)/i,
    ];

    for (const pattern of patterns) {
      const match = feature.match(pattern);
      if (match) return parseInt(match[1], 10);
    }
  }

  return 100;
};

const getPlanIcon = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes("basic")) return Users;
  if (name.includes("professional") || name.includes("growth")) return Zap;
  if (name.includes("enterprise") || name.includes("ultimate")) return Shield;
  return Star;
};

const calculatePlanPrice = (
  plan: SubscriptionPlan,
  members: number,
  billingCycle: BillingCycle,
) => {
  const base = plan.base_price_per_member * members;
  if (billingCycle === "yearly") {
    const discount = plan.annual_discount_percentage || 0;
    return base * 12 * (1 - discount / 100);
  }
  return base;
};

const getPlanButtonText = (
  plan: SubscriptionPlan,
  isCurrent: boolean,
  memberCount: number,
  billingCycle: BillingCycle,
  subscriptionStatus: ReturnType<typeof useOptimizedSubscription>["subscriptionStatus"],
) => {
  if (!subscriptionStatus) return "Pilih Plan";

  const currentMemberLimit = subscriptionStatus.member_count || 0;
  const currentBillingCycle = (subscriptionStatus.billing_cycle as BillingCycle) || "monthly";

  if (isCurrent) {
    if (memberCount > currentMemberLimit) return "Upgrade Plan";
    if (memberCount < currentMemberLimit) return "Sesuaikan Limit";
    if (billingCycle !== currentBillingCycle) {
      return billingCycle === "yearly" ? "Upgrade ke Tahunan" : "Ganti ke Bulanan";
    }
    return "Plan Aktif";
  }

  if (plan.demo_required) return "Hubungi Kami";
  return "Pilih Plan";
};

const canChangePlan = (
  plan: SubscriptionPlan,
  isCurrent: boolean,
  memberCount: number,
  currentEmployeeCount: number,
  subscriptionStatus: ReturnType<typeof useOptimizedSubscription>["subscriptionStatus"],
) => {
  if (!subscriptionStatus) return true;
  const currentMemberLimit = subscriptionStatus.member_count || 0;

  if (isCurrent) {
    if (memberCount < currentMemberLimit) {
      return currentEmployeeCount <= memberCount;
    }
    return true;
  }

  return currentEmployeeCount <= memberCount;
};

const MobilePendingChangesCard = memo(() => {
  const { data: pendingChanges, isLoading } = usePendingSubscriptionChanges();
  const cancelScheduledChange = useCancelScheduledChange();

  if (isLoading) {
    return (
      <Card className="border border-border bg-muted/30">
        <CardHeader>
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingChanges || pendingChanges.length === 0) return null;

  const handleCancel = async (changeId: string) => {
    const confirmed = window.confirm("Batalkan perubahan terjadwal ini?");
    if (!confirmed) return;

    try {
      await cancelScheduledChange.mutateAsync(changeId);
      toast.success("Perubahan berhasil dibatalkan.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membatalkan perubahan.");
    }
  };

  return (
    <Card className="border border-blue-200 bg-blue-50/60">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-blue-900">
              Perubahan Terjadwal
            </CardTitle>
            <CardDescription className="text-xs text-blue-700">
              {pendingChanges.length} perubahan akan diterapkan otomatis
            </CardDescription>
          </div>
          <CalendarDays className="h-5 w-5 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingChanges.map((change) => (
          <div
            key={change.id}
            className="rounded-lg border border-blue-200 bg-white p-3 text-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">
                  {change.change_type === "upgrade"
                    ? "Upgrade"
                    : change.change_type === "downgrade"
                      ? "Downgrade"
                      : change.change_type === "member_increase"
                        ? "Tambah Member"
                        : change.change_type === "member_decrease"
                          ? "Kurangi Member"
                          : "Perubahan Plan"}
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {new Date(change.scheduled_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:bg-red-50"
                onClick={() => handleCancel(change.id)}
                disabled={cancelScheduledChange.isPending}
              >
                <span className="sr-only">Batalkan</span>
                ×
              </Button>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{change.current_plan?.name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-blue-700">{change.target_plan?.name}</span>
              </div>
              {change.current_member_count !== change.target_member_count && (
                <div>
                  Member:{" "}
                  <span className="font-medium text-foreground">{change.current_member_count}</span>{" "}
                  →{" "}
                  <span className="font-medium text-blue-700">{change.target_member_count}</span>
                </div>
              )}
              {change.prorate_amount > 0 && (
                <div className="text-green-600">
                  Biaya tambahan: {formatIDR(change.prorate_amount)}
                </div>
              )}
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-blue-700">
          Sistem akan menerapkan perubahan sesuai jadwal yang dipilih.
        </p>
      </CardContent>
    </Card>
  );
});

MobilePendingChangesCard.displayName = "MobilePendingChangesCard";

const PlanCard = memo(
  ({
    plan,
    totalPrice,
    monthlyPrice,
    isCurrent,
    isPopular,
    isTrial,
    membersWithinLimit,
    memberCount,
    billingCycle,
    onSelect,
    disabled,
    buttonText,
    maxMembers,
    currentMemberCount,
    currentEmployeeCount,
    subscriptionStatus,
    isComingSoon,
    onMemberCountChange,
    onBillingCycleChange,
  }: {
    plan: SubscriptionPlan;
    totalPrice: number;
    monthlyPrice: number;
    isCurrent: boolean;
    isPopular: boolean;
    isTrial: boolean;
    membersWithinLimit: boolean;
    memberCount: number;
    billingCycle: BillingCycle;
    onSelect: () => void;
    disabled: boolean;
    buttonText: string;
    maxMembers: number;
    currentMemberCount: number;
    currentEmployeeCount: number;
    subscriptionStatus: ReturnType<typeof useOptimizedSubscription>["subscriptionStatus"];
    isComingSoon: boolean;
    onMemberCountChange: (planId: string, count: number) => void;
    onBillingCycleChange: (planId: string, checked: boolean) => void;
  }) => {
    const IconComponent = getPlanIcon(plan.name);
    return (
      <Card
        className={cn(
          "relative rounded-2xl border border-border bg-background shadow-sm transition-all",
          isCurrent && "border-green-400 bg-green-50/60 shadow-lg",
          !isCurrent && isPopular && "border-blue-400 bg-blue-50/60 shadow-lg",
          isComingSoon && "border-dashed border-muted-foreground/40 bg-muted/30",
        )}
      >
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    isCurrent
                      ? "bg-green-100 text-green-600"
                      : isPopular
                        ? "bg-blue-100 text-blue-600"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {plan.name}
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                {plan.description}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isCurrent && (
                <Badge className="bg-green-500 text-xs text-white">Plan Aktif</Badge>
              )}
              {!isCurrent && isPopular && !isComingSoon && (
                <Badge className="bg-blue-500 text-xs text-white">Paling Populer</Badge>
              )}
              {isComingSoon && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Segera Hadir
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-1 text-left">
            <div className="text-2xl font-bold text-foreground">{formatIDR(totalPrice)}</div>
            <div className="text-xs text-muted-foreground">
              {billingCycle === "yearly" ? "per tahun" : "per bulan"} untuk {memberCount} member
            </div>
            <div className="text-[11px] text-muted-foreground">
              Setara {formatIDR(monthlyPrice)} per bulan
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                {isTrial
                  ? `Plan ini maksimal ${maxMembers} member`
                  : `Tidak ada batas member (rekomendasi hingga ${maxMembers})`}
              </span>
            </div>
            {!membersWithinLimit && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Jumlah member melebihi batas plan ini. Kurangi jumlah member atau pilih plan
                  yang lebih tinggi.
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Jumlah member</span>
                <span className="text-sm font-semibold text-foreground">{memberCount} anggota</span>
              </div>
              <Slider
                value={[memberCount]}
                min={1}
                max={maxMembers}
                step={1}
                onValueChange={
                  isTrial ? undefined : (value) => onMemberCountChange(plan.id, value[0])
                }
                disabled={isTrial}
              />
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>1 member</span>
                <span>{maxMembers} member</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pembayaran Tahunan</p>
                <p className="text-[11px] text-muted-foreground">
                  {plan.annual_discount_percentage
                    ? `Hemat hingga ${plan.annual_discount_percentage}%`
                    : "Bayar bulanan atau tahunan"}
                </p>
              </div>
              <Switch
                checked={billingCycle === "yearly"}
                onCheckedChange={(checked) => onBillingCycleChange(plan.id, checked)}
                disabled={isComingSoon}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fitur yang disertakan
            </p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
              {plan.features?.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Harga dasar per member</span>
              <span className="font-semibold text-foreground">
                {formatIDR(plan.base_price_per_member)}
              </span>
            </div>
            {billingCycle === "yearly" && plan.annual_discount_percentage ? (
              <div className="mt-2 flex items-center justify-between text-green-600">
                <span>Diskon paket tahunan</span>
                <span className="font-semibold">
                  {plan.annual_discount_percentage}% ({formatIDR(monthlyPrice * 12 * (plan.annual_discount_percentage / 100))})
                </span>
              </div>
            ) : null}
          </div>

          {isCurrent && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              Limit member saat ini {currentMemberCount} • {currentEmployeeCount} karyawan aktif
            </div>
          )}

          <Button
            className="h-12 w-full rounded-full text-sm font-semibold"
            onClick={onSelect}
            disabled={disabled || isComingSoon}
          >
            {isComingSoon ? "Segera Hadir" : buttonText}
          </Button>
          {disabled && !membersWithinLimit && (
            <p className="text-center text-xs text-destructive">
              Kurangi jumlah member agar plan dapat dipilih.
            </p>
          )}
          {isComingSoon && (
            <p className="text-center text-[11px] text-muted-foreground">
              Paket ini belum tersedia. Hubungi tim kami untuk informasi lebih lanjut.
            </p>
          )}
        </CardContent>
      </Card>
    );
  },
);

PlanCard.displayName = "PlanCard";

const HRISSubscriptionPlansTab = () => {
  const { data: plans, isLoading, error } = useSubscriptionPlans();
  const { subscriptionStatus, subscriptionPlans } = useOptimizedSubscription();
  const { data: currentEmployeeCount = 0 } = useEmployeeCount();
  const { initiateMidtransPayment } = useMidtransPayment();
  const proRateCalculation = useProRateCalculation();
  const schedulePlanChange = useSchedulePlanChange();

  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [billingCycles, setBillingCycles] = useState<Record<string, BillingCycle>>({});
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [isOptionsOpen, setOptionsOpen] = useState(false);
  const [proRatedData, setProRatedData] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedMemberCount, setSelectedMemberCount] = useState(1);

  useEffect(() => {
    if (!plans) return;
    setMemberCounts((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, number> = {};
      plans.forEach((plan) => {
        const isTrial = plan.name === "Trial" || plan.base_price_per_member === 0;
        const maxMembers = isTrial ? getEmployeeLimitFromFeatures(plan.features) : 100;
        const isCurrent =
          subscriptionStatus?.plan_name &&
          subscriptionStatus.plan_name.toLowerCase() === plan.name.toLowerCase();
        if (isCurrent) {
          next[plan.id] = subscriptionStatus?.member_count || currentEmployeeCount || 1;
        } else if (isTrial) {
          next[plan.id] = maxMembers;
        } else {
          next[plan.id] = 5;
        }
      });
      return next;
    });
    setBillingCycles((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, BillingCycle> = {};
      plans.forEach((plan) => {
        const isCurrent =
          subscriptionStatus?.plan_name &&
          subscriptionStatus.plan_name.toLowerCase() === plan.name.toLowerCase();
        next[plan.id] = (isCurrent
          ? subscriptionStatus?.billing_cycle
          : plan.billing_cycle) as BillingCycle || "monthly";
      });
      return next;
    });
  }, [plans, subscriptionStatus, currentEmployeeCount]);

  const planMetaList: PlanMeta[] = useMemo(() => {
    if (!plans) return [];
    return plans.map((plan) => {
      const isTrial = plan.name === "Trial" || plan.base_price_per_member === 0;
      const maxMembers = isTrial ? getEmployeeLimitFromFeatures(plan.features) : 100;
      const isCurrent =
        subscriptionStatus?.plan_name &&
        subscriptionStatus.plan_name.toLowerCase() === plan.name.toLowerCase();
      return { plan, maxMembers, isCurrent, isTrial };
    });
  }, [plans, subscriptionStatus]);

  const sortedPlans = useMemo(() => {
    return [...planMetaList].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return (a.plan.base_price_per_member || 0) - (b.plan.base_price_per_member || 0);
    });
  }, [planMetaList]);

  const handleMemberCountChange = useCallback((planId: string, count: number) => {
    setMemberCounts((prev) => ({ ...prev, [planId]: count }));
  }, []);

  const handleBillingCycleToggle = useCallback((planId: string, checked: boolean) => {
    setBillingCycles((prev) => ({ ...prev, [planId]: checked ? "yearly" : "monthly" }));
  }, []);

  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan, memberCount: number, billingCycle: BillingCycle) => {
      setSelectedPlan(plan);
      setSelectedMemberCount(memberCount);
      setIsYearly(billingCycle === "yearly");
      const targetPlanId =
        plan.id ||
        subscriptionPlans?.find((p) => p.name === plan.name)?.id ||
        null;
      if (!targetPlanId) {
        toast.error("Plan tidak valid.");
        return;
      }

      try {
        const calculation = await proRateCalculation.mutateAsync({
          new_member_count: memberCount,
          target_plan_id: targetPlanId,
        });

        setProRatedData(calculation);
        if (calculation?.success) {
          const info = calculation.calculation;
          if (info?.charge_now && info?.prorate_amount > 0 && info?.is_plan_change) {
            setOptionsOpen(true);
          } else {
            setConfirmationOpen(true);
          }
        } else {
          setConfirmationOpen(true);
        }
      } catch (err) {
        console.error(err);
        setProRatedData(null);
        setConfirmationOpen(true);
      }
    },
    [proRateCalculation, subscriptionPlans],
  );

  const handleConfirmUpgrade = useCallback(async () => {
    if (!selectedPlan) return;
    try {
      const basePrice = selectedPlan.base_price_per_member;
      const amount =
        proRatedData?.calculation?.prorate_amount ??
        (isYearly
          ? getYearlyPriceForMembers(basePrice, selectedMemberCount)
          : getMonthlyPriceForMembers(basePrice, selectedMemberCount));

       await initiateMidtransPayment({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount,
        memberCount: selectedMemberCount,
        billingCycle: isYearly ? "yearly" : "monthly",
        proRateDetails: proRatedData?.calculation
          ? {
              is_member_upgrade:
                proRatedData.calculation.is_upgrade &&
                !proRatedData.calculation.is_plan_change,
              previous_member_count: proRatedData.current_plan.member_count,
              member_difference: proRatedData.calculation.member_difference,
              remaining_days: proRatedData.calculation.remaining_days,
              prorate_amount: proRatedData.calculation.prorate_amount,
              prorate_percentage: proRatedData.calculation.prorate_percentage,
            }
          : undefined,
      });

      setConfirmationOpen(false);
      setSelectedPlan(null);
      setProRatedData(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses pembayaran.");
    }
  }, [
    selectedPlan,
    selectedMemberCount,
    isYearly,
    initiateMidtransPayment,
    proRatedData,
  ]);

  const handleChooseImmediate = useCallback(async () => {
    setOptionsOpen(false);
    await handleConfirmUpgrade();
  }, [handleConfirmUpgrade]);

  const handleChooseScheduled = useCallback(async () => {
    if (!selectedPlan || !proRatedData?.calculation) return;
    try {
      await schedulePlanChange.mutateAsync({
        current_plan_id: proRatedData.current_plan.id,
        target_plan_id: proRatedData.target_plan.id,
        current_member_count: proRatedData.current_plan.member_count,
        target_member_count: proRatedData.calculation.new_member_count,
        change_type: (proRatedData.calculation.change_type || "upgrade") as any,
        scheduled_date: proRatedData.calculation.scheduled_date,
        prorate_amount: 0,
        charge_now: false,
      });
      setOptionsOpen(false);
      setSelectedPlan(null);
      setProRatedData(null);
      toast.success("Perubahan dijadwalkan.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menjadwalkan perubahan.");
    }
  }, [schedulePlanChange, proRatedData, selectedPlan]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <LoadingDots size="lg" />
        <p className="text-sm text-muted-foreground">Memuat paket subscription...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Gagal memuat data</CardTitle>
          <CardDescription>
            Kami tidak dapat memuat daftar paket saat ini. Silakan coba beberapa saat lagi.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <MobilePendingChangesCard />

        <div className="space-y-4">
          {sortedPlans.map(({ plan, isCurrent, isPopular, isTrial, maxMembers }) => {
            const description = plan.description?.toLowerCase() ?? "";
            const memberCount =
              memberCounts[plan.id] ??
              (isCurrent
                ? subscriptionStatus?.member_count || currentEmployeeCount || 1
                : isTrial
                  ? maxMembers
                  : 5);
            const billingCycle = billingCycles[plan.id] || "monthly";
            const membersWithinLimit = memberCount <= maxMembers;
            const totalPrice = calculatePlanPrice(plan, memberCount, billingCycle);
            const monthlyPrice = plan.base_price_per_member * memberCount;
            const buttonText = getPlanButtonText(
              plan,
              isCurrent,
              memberCount,
              billingCycle,
              subscriptionStatus,
            );
            const beings = plan.description?.toLowerCase() ?? "";
            const isComingSoonRaw =
              description.includes("coming soon") ||
              description.includes("comming soon") ||
              plan.demo_required ||
              plan.name.toLowerCase().includes("business");
            const isComingSoon = !isCurrent && isComingSoonRaw;
            const disabled =
              (!membersWithinLimit && !isCurrent) ||
              (isCurrent &&
                buttonText === "Plan Aktif" &&
                billingCycle === subscriptionStatus?.billing_cycle &&
                memberCount === (subscriptionStatus?.member_count || memberCount)) ||
              isComingSoon;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                totalPrice={totalPrice}
                monthlyPrice={monthlyPrice}
                isCurrent={isCurrent}
                isPopular={isPopular}
                isTrial={isTrial}
                membersWithinLimit={membersWithinLimit}
                memberCount={memberCount}
                billingCycle={billingCycle}
                onSelect={() => handleUpgrade(plan, memberCount, billingCycle)}
                disabled={disabled}
                buttonText={buttonText}
                maxMembers={maxMembers}
                currentMemberCount={subscriptionStatus?.member_count || 0}
                currentEmployeeCount={currentEmployeeCount}
                subscriptionStatus={subscriptionStatus}
                isComingSoon={isComingSoon}
                onMemberCountChange={handleMemberCountChange}
                onBillingCycleChange={handleBillingCycleToggle}
              />
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Kenapa memilih ProfitLoop?
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>✅ Data real-time dan sinkron dengan Supabase.</li>
            <li>✅ Dukungan langsung dari tim customer success kami.</li>
            <li>✅ Sistem prorate otomatis untuk perubahan plan/members.</li>
          </ul>
        </div>
      </div>

      {selectedPlan && subscriptionStatus && (
        <MobileUpgradeConfirmationModal
          open={isConfirmationOpen}
          onOpenChange={setConfirmationOpen}
          onConfirm={handleConfirmUpgrade}
          currentPlan={
            subscriptionPlans?.find((p) => p.name === subscriptionStatus.plan_name) || selectedPlan
          }
          newPlan={selectedPlan}
          subscriptionStatus={subscriptionStatus}
          billingCycle={isYearly ? "yearly" : "monthly"}
          currentMemberCount={subscriptionStatus.member_count || 0}
          newMemberCount={selectedMemberCount}
          proRatedData={proRatedData}
        />
      )}

      <MobileUpgradeOptionsModal
        open={isOptionsOpen}
        onOpenChange={setOptionsOpen}
        onChooseImmediate={handleChooseImmediate}
        onChooseScheduled={handleChooseScheduled}
        immediateAmount={proRatedData?.calculation?.prorate_amount || 0}
        scheduledDate={proRatedData?.calculation?.scheduled_date || ""}
        planName={selectedPlan?.name || ""}
        currentPlanName={proRatedData?.current_plan?.name || subscriptionStatus?.plan_name || ""}
        memberChange={{
          from: proRatedData?.current_plan?.member_count || subscriptionStatus?.member_count || 0,
          to: selectedMemberCount,
        }}
        proRateData={
          proRatedData?.calculation
            ? {
                remainingDays: proRatedData.calculation.remaining_days,
                proRatePercentage: proRatedData.calculation.prorate_percentage,
                memberCostIncrease: proRatedData.calculation.member_change_charge,
                currentPlanCredit: proRatedData.calculation.current_plan_credit,
              }
            : undefined
        }
      />
    </>
  );
};

export default memo(HRISSubscriptionPlansTab);

