import { memo, useEffect } from "react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { LoadingDots } from "@/components/LoadingDots";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";
import { useOptimizedSubscription } from "@/features/10-management/hooks/useOptimizedSubscription";
import { useSubscriptionAnalytics } from "@/features/10-overview/hooks/useSubscriptionAnalytics";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { CurrentSubscription, EmployeeGrowthChart, UsageMetricsCards } from "@/features/10-overview/section";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";

const useAppTranslation = () => ({
  t: (_: string, defaultValue: string) => defaultValue,
});

const OverviewTabPage = memo(() => {
  useOptimizedPerformanceMonitor("OverviewTabPageMobile");
  const { t } = useAppTranslation();
  const { activeTab, handleTabChange, setActiveTabOnLocationChange } = useSubscriptionTabs("overview");

  const { organizationId } = useCurrentOrg();

  const { subscriptionStatus, isLoading, statusError, refreshSubscriptionStatus } = useOptimizedSubscription();
  const { analytics, isLoading: analyticsLoading } = useSubscriptionAnalytics();

  const isInitialLoading = isLoading && !subscriptionStatus;

  useEffect(() => {
    setActiveTabOnLocationChange();
  }, [setActiveTabOnLocationChange]);


  useEffect(() => {
    if (organizationId && isLoading && !subscriptionStatus && !statusError) {
      const timer = window.setTimeout(() => {
        refreshSubscriptionStatus();
      }, 10000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [organizationId, isLoading, subscriptionStatus, statusError, refreshSubscriptionStatus]);

  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <LoadingDots size="lg" />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {statusError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">{t("subscription.overview.errorTitle", "Gagal memuat data")}</CardTitle>
              <CardDescription className="text-destructive">
                {t("subscription.overview.errorDescription", "Silakan coba muat ulang data subscription Anda.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => refreshSubscriptionStatus()}>
                {t("subscription.overview.refresh", "Muat ulang data")}
              </Button>
            </CardContent>
          </Card>
        )}

        {subscriptionStatus && <CurrentSubscription subscriptionStatus={subscriptionStatus} />}
        <EmployeeGrowthChart data={analytics?.employee_growth || []} isLoading={analyticsLoading} />
        <UsageMetricsCards metrics={analytics?.usage_metrics || null} isLoading={analyticsLoading} />

      </div>
    );
  };

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 bg-background pb-20">
            <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border">
              <SidebarTrigger />
              <div className="text-sm font-semibold text-foreground">
                {t("subscription.overview.pageTitle", "Subscription Overview")}
              </div>
            </div>

            <div className="px-3 pt-4 pb-6 space-y-3">{renderContent()}</div>

            <SubscriptionBottomTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
});

OverviewTabPage.displayName = "OverviewTabPage";

export default OverviewTabPage;
