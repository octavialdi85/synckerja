import { memo, useEffect } from "react";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Button } from "@/mobile/components/ui/button";
import { LoadingDots } from "@/components/LoadingDots";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";
import { useOptimizedSubscription } from "@/features/10-management/hooks/useOptimizedSubscription";
import { MobileCurrentPlanCard } from "./section/management/MobileCurrentPlanCard";
import { MobileSubscriptionStats } from "./section/management/MobileSubscriptionStats";
import { MobilePaymentHistory } from "./section/management/MobilePaymentHistory";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";

const useAppTranslation = () => ({
  t: (_: string, defaultValue: string) => defaultValue,
});
const ManagementTabPage = memo(() => {
  useOptimizedPerformanceMonitor("ManagementTabPageMobile");
  const { t } = useAppTranslation();
  const { activeTab, handleTabChange, setActiveTabOnLocationChange } = useSubscriptionTabs("management");
  const { subscriptionStatus, isLoading, refreshSubscriptionStatus } = useOptimizedSubscription();

  useEffect(() => {
    setActiveTabOnLocationChange();
  }, [setActiveTabOnLocationChange]);

  const renderContent = () => {
    if (isLoading && !subscriptionStatus) {
      return (
        <div className="flex justify-center items-center py-12">
          <LoadingDots size="lg" />
        </div>
      );
    }

    if (!subscriptionStatus) {
      return (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>{t("subscription.management.noDataTitle", "Subscription belum tersedia")}</CardTitle>
            <CardDescription>
              {t(
                "subscription.management.noDataDescription",
                "Kami belum dapat menemukan informasi subscription aktif untuk organisasi Anda.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => refreshSubscriptionStatus()}>
              {t("subscription.management.refreshStatus", "Perbarui Status")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <MobileCurrentPlanCard
          subscriptionStatus={subscriptionStatus}
          onRefresh={refreshSubscriptionStatus}
          isRefreshing={isLoading}
        />
        <MobileSubscriptionStats subscriptionStatus={subscriptionStatus} />
        <MobilePaymentHistory />
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
                {t("subscription.management.pageTitleShort", "Subscription Management")}
              </div>
            </div>

            <div className="px-3 pt-4 pb-6 space-y-3">
              {renderContent()}
            </div>

            <SubscriptionBottomTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
});

ManagementTabPage.displayName = "ManagementTabPage";

export default ManagementTabPage;
