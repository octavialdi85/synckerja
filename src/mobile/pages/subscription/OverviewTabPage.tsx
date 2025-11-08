import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Layers, Settings2 } from "lucide-react";
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
import {
  CurrentSubscription,
  EmployeeGrowthChart,
  FeatureUsageChart,
  UsageMetricsCards,
} from "@/features/10-overview/section";
import { cn } from "@/lib/utils";

type SubscriptionTabKey = "overview" | "plans" | "management";

const TABS: Record<SubscriptionTabKey, string> = {
  overview: "/subscription/overview",
  plans: "/subscription/plans",
  management: "/subscription/management",
};

const tabItems = [
  { key: "overview" as const, icon: BarChart3 },
  { key: "plans" as const, icon: Layers },
  { key: "management" as const, icon: Settings2 },
];

const useAppTranslation = () => {
  const translate = useCallback(
    (_: string, defaultValue: string, variables?: Record<string, string | number>) => {
      if (!variables) return defaultValue;
      return Object.entries(variables).reduce<string>(
        (acc, [placeholder, value]) => acc.replace(`{{${placeholder}}}`, String(value)),
        defaultValue,
      );
    },
    [],
  );
  return { t: translate };
};

const getTabKeyFromPath = (pathname: string): SubscriptionTabKey => {
  if (pathname.includes("/subscription/plans")) return "plans";
  if (pathname.includes("/subscription/management")) return "management";
  return "overview";
};

const SubscriptionBottomTabs = memo(
  ({
    activeTab,
    onTabChange,
  }: {
    activeTab: SubscriptionTabKey;
    onTabChange: (tab: SubscriptionTabKey) => void;
  }) => {
    const { t } = useAppTranslation();

    const labels: Record<SubscriptionTabKey, string> = useMemo(
      () => ({
        overview: t("subscription.tabs.overview", "Overview"),
        plans: t("subscription.tabs.plans", "Plans"),
        management: t("subscription.tabs.management", "Management"),
      }),
      [t],
    );

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="grid grid-cols-3 w-full">
          {tabItems.map(({ key, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={cn(
                  "flex flex-col items-center py-2 px-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{labels[key]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  },
);

SubscriptionBottomTabs.displayName = "SubscriptionBottomTabs";

const OverviewTabPage = memo(() => {
  useOptimizedPerformanceMonitor("OverviewTabPageMobile");
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SubscriptionTabKey>(() => getTabKeyFromPath(location.pathname));

  const { organizationId } = useCurrentOrg();

  const { subscriptionStatus, isLoading, statusError, refreshSubscriptionStatus } = useOptimizedSubscription();
  const { analytics, isLoading: analyticsLoading } = useSubscriptionAnalytics();

  const isInitialLoading = isLoading && !subscriptionStatus;

  useEffect(() => {
    setActiveTab(getTabKeyFromPath(location.pathname));
  }, [location.pathname]);


  useEffect(() => {
    if (organizationId && isLoading && !subscriptionStatus && !statusError) {
      const timer = window.setTimeout(() => {
        refreshSubscriptionStatus();
      }, 10000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [organizationId, isLoading, subscriptionStatus, statusError, refreshSubscriptionStatus]);

  const handleTabChange = useCallback(
    (tab: SubscriptionTabKey) => {
      setActiveTab(tab);
      navigate(TABS[tab]);
    },
    [navigate],
  );

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

              <FeatureUsageChart data={analytics?.feature_usage || []} isLoading={analyticsLoading} />

        <UsageMetricsCards metrics={analytics?.usage_metrics || null} isLoading={analyticsLoading} />

      </div>
    );
  };

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 bg-background pb-24 flex flex-col">
            <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border">
              <SidebarTrigger />
              <div className="text-sm font-semibold text-foreground">
                {t("subscription.overview.pageTitle", "Subscription Overview")}
              </div>
            </div>

            <div className="flex-1 px-3 pb-4">
              <div className="h-full overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] space-y-3 pb-6 pt-4">
                {renderContent()}
              </div>
            </div>

            <SubscriptionBottomTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
});

OverviewTabPage.displayName = "OverviewTabPage";

export default OverviewTabPage;
