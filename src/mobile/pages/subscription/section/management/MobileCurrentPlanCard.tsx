import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { Progress } from "@/mobile/components/ui/progress";
import { Button } from "@/mobile/components/ui/button";
import { RefreshCw, Users, CalendarDays, ShieldCheck } from "lucide-react";
import type { SubscriptionStatus } from "@/features/10-management/hooks/useOptimizedSubscription";

interface MobileCurrentPlanCardProps {
  subscriptionStatus: SubscriptionStatus;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const MobileCurrentPlanCard = memo(
  ({ subscriptionStatus, onRefresh, isRefreshing }: MobileCurrentPlanCardProps) => {
    const usagePercent =
      subscriptionStatus.member_count > 0
        ? Math.min(
            100,
            Math.round(
              ((subscriptionStatus.current_employees || 0) / subscriptionStatus.member_count) * 100,
            ),
          )
        : 0;

    const statusBadge = subscriptionStatus.is_active
      ? { label: "Aktif", className: "bg-green-500 text-white" }
      : subscriptionStatus.is_trial
        ? { label: "Trial", className: "bg-blue-500 text-white" }
        : { label: "Tidak Aktif", className: "bg-destructive text-destructive-foreground" };

    return (
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base text-foreground">Ringkasan Subscription</CardTitle>
              <CardDescription className="text-xs">
                Detail plan aktif dan batas penggunaan saat ini.
              </CardDescription>
            </div>
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-3 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan aktif</p>
                <p className="text-sm font-semibold text-foreground">
                  {subscriptionStatus.plan_name || "Tanpa Plan"}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Penggunaan member
                </p>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {subscriptionStatus.current_employees}/{subscriptionStatus.member_count}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {usagePercent >= 80
                ? "Anda mendekati batas member. Pertimbangkan upgrade plan."
                : "Masih tersedia kapasitas member untuk organisasi Anda."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Model pembayaran</span>
              <span className="font-semibold text-foreground capitalize">
                {subscriptionStatus.billing_cycle || "Bulanan"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Berakhir pada</span>
              <span className="font-semibold text-foreground">
                {formatDate(subscriptionStatus.subscription_end_date || subscriptionStatus.end_date)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-card p-3 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Pembayaran berikutnya</p>
                <p>{formatDate(subscriptionStatus.next_payment_date)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

MobileCurrentPlanCard.displayName = "MobileCurrentPlanCard";

