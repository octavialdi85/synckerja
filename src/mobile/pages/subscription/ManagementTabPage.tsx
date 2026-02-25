import { memo, useEffect, type ReactNode } from "react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { ManagementTabPageSkeleton } from "./ManagementTabPageSkeleton";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";
import { useOptimizedSubscription } from "@/features/10-management/hooks/useOptimizedSubscription";
import { useNextBillingFromPayments } from "@/features/10-management/hooks/useNextBillingFromPayments";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { MobileCurrentPlanCard } from "./section/management/MobileCurrentPlanCard";
import { MobileSubscriptionStats } from "./section/management/MobileSubscriptionStats";
import { MobilePaymentHistory } from "./section/management/MobilePaymentHistory";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const ManagementTabPage = memo(() => {
  useStatusBarStyle("light");
  useOptimizedPerformanceMonitor("ManagementTabPageMobile");
  const { t } = useAppTranslation();
  const { activeTab, handleTabChange, setActiveTabOnLocationChange } = useSubscriptionTabs("management");
  const { organizationId } = useCurrentOrg();
  const { subscriptionStatus, isLoading, statusError, refreshSubscriptionStatus } = useOptimizedSubscription();
  const { nextBillingDate, daysUntilExpiry, paymentsLoading } = useNextBillingFromPayments(organizationId ?? undefined);
  const nextBillingOverride =
    nextBillingDate != null ? { date: nextBillingDate, daysRemaining: daysUntilExpiry } : null;

  useEffect(() => {
    setActiveTabOnLocationChange();
  }, [setActiveTabOnLocationChange]);

  let content: ReactNode;
  if (isLoading && !subscriptionStatus) {
    content = <ManagementTabPageSkeleton />;
  } else if (statusError) {
    content = (
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("subscription.management.errorTitle", "Gagal memuat data subscription")}
          </CardTitle>
          <CardDescription>
            {t("subscription.management.errorDescription", "Terjadi kesalahan saat memuat data. Periksa koneksi dan coba lagi.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => refreshSubscriptionStatus()}>
            {t("subscription.management.retryButton", "Coba lagi")}
          </Button>
        </CardContent>
      </Card>
    );
  } else if (!subscriptionStatus) {
    content = (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>{t("subscription.management.noDataTitle", "Subscription belum tersedia")}</CardTitle>
          <CardDescription>
            {t("subscription.management.noDataDescription", "Kami belum dapat menemukan informasi subscription aktif untuk organisasi Anda.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => refreshSubscriptionStatus()}>
            {t("subscription.management.refreshStatus", "Perbarui Status")}
          </Button>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <div className="space-y-1">
        <MobileCurrentPlanCard
          subscriptionStatus={subscriptionStatus}
          onRefresh={refreshSubscriptionStatus}
          isRefreshing={isLoading}
          nextBillingOverride={nextBillingOverride}
          nextBillingLoading={paymentsLoading}
        />
        <MobileSubscriptionStats
          subscriptionStatus={subscriptionStatus}
          nextBillingOverride={nextBillingOverride}
          nextBillingLoading={paymentsLoading}
        />
        <MobilePaymentHistory />
      </div>
    );
  }

  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <main
            className="flex flex-col bg-background fixed inset-x-0 z-0"
            style={{
              top: viewportOffsetTop,
              height: viewportHeight > 0 ? viewportHeight : undefined,
              minHeight: viewportHeight > 0 ? undefined : "100dvh",
            }}
          >
            <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-base font-semibold text-foreground">{t("subscription.management.pageTitle", "Subscription Management")}</h1>
                  <p className="text-xs text-muted-foreground">{t("subscription.management.pageSubtitle", "Current plan, stats, and payment history")}</p>
                </div>
              </div>
              <div />
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
                <div className="mx-auto w-full max-w-md px-2 pt-2 space-y-1 content-padding-above-nav-default">
                  {content}
                </div>
              </div>
            </div>

            <SubscriptionBottomTabs activeTab={activeTab} onTabChange={handleTabChange} className="safe-area-bottom-lower" />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
});

ManagementTabPage.displayName = "ManagementTabPage";

export default ManagementTabPage;
