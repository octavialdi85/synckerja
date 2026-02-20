import { memo, useEffect } from "react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { OverviewTabPageSkeleton } from "./OverviewTabPageSkeleton";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";
import { useOptimizedSubscription } from "@/features/10-management/hooks/useOptimizedSubscription";
import { useSubscriptionAnalytics } from "@/features/10-overview/hooks/useSubscriptionAnalytics";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { CurrentSubscription, EmployeeGrowthChart, UsageMetricsCards } from "@/features/10-overview/section";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

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

  useStatusBarStyle('light');
  const renderContent = () => {
    if (isInitialLoading) {
      return <OverviewTabPageSkeleton />;
    }

    return (
      <div className="space-y-1">
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

  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          {/* Same structure as Home/Daily Task/Profile/LiveChat: fixed viewport container, header (safe-area-top), scrollable content, footer (safe-area-bottom-lower) */}
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
                  <h1 className="text-base font-semibold text-foreground">{t("subscription.overview.pageTitle", "Subscription Overview")}</h1>
                  <p className="text-xs text-muted-foreground">{t("subscription.overview.pageSubtitle", "Plan status and usage")}</p>
                </div>
              </div>
              <div />
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
                <div className="mx-auto w-full max-w-md px-2 pt-2 space-y-1 content-padding-above-nav-default">
                  {renderContent()}
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

OverviewTabPage.displayName = "OverviewTabPage";

export default OverviewTabPage;
