import { memo, useMemo } from "react";
import { Card, CardContent } from "@/mobile/components/ui/card";
import type { SubscriptionStatus } from "@/features/10-management/hooks/useOptimizedSubscription";
import { Calendar, Users, Clock3, Shield } from "lucide-react";
import { formatIDR } from "@/features/1-login/utils/subscriptionUtils";

interface MobileSubscriptionStatsProps {
  subscriptionStatus: SubscriptionStatus;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const MobileSubscriptionStats = memo(({ subscriptionStatus }: MobileSubscriptionStatsProps) => {
  const stats = useMemo(
    () => [
      {
        icon: Shield,
        title: "Status Plan",
        value: subscriptionStatus.is_trial
          ? "Trial aktif"
          : subscriptionStatus.is_active
            ? "Aktif"
            : "Tidak aktif",
        accent: "bg-emerald-100 text-emerald-700",
      },
      {
        icon: Calendar,
        title: "Periode Berakhir",
        value: formatDate(subscriptionStatus.subscription_end_date || subscriptionStatus.end_date),
        accent: "bg-blue-100 text-blue-700",
      },
      {
        icon: Users,
        title: "Anggota Terpakai",
        value: `${subscriptionStatus.current_employees}/${subscriptionStatus.member_count}`,
        accent: "bg-amber-100 text-amber-700",
      },
      {
        icon: Clock3,
        title: "Sisa Hari",
        value: `${subscriptionStatus.days_until_expiry ?? 0} hari`,
        accent: "bg-purple-100 text-purple-700",
      },
    ],
    [subscriptionStatus],
  );

  const billingSummary = useMemo(() => {
    const basePrice = subscriptionStatus.base_price_per_member || 0;
    const amount =
      subscriptionStatus.billing_cycle === "yearly"
        ? basePrice * subscriptionStatus.member_count * 12
        : basePrice * subscriptionStatus.member_count;
    return {
      billingCycle: subscriptionStatus.billing_cycle === "yearly" ? "Tahunan" : "Bulanan",
      amount: formatIDR(amount),
    };
  }, [subscriptionStatus]);

  return (
    <div className="space-y-3">
      <Card className="border border-border">
        <CardContent className="grid grid-cols-2 gap-3 p-3">
          {stats.map((stat, index) => (
            <div key={stat.title} className="space-y-1 rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${stat.accent}`}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-sm font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border bg-muted/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm text-muted-foreground">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide">Rangkuman billing</p>
            <p className="text-sm font-semibold text-foreground">{billingSummary.billingCycle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs">Estimasi tagihan</p>
            <p className="text-sm font-semibold text-foreground">{billingSummary.amount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

MobileSubscriptionStats.displayName = "MobileSubscriptionStats";

