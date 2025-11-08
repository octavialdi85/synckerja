import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { MobileCurrentPlanCard } from "./section/management/MobileCurrentPlanCard";
import { MobileSubscriptionStats } from "./section/management/MobileSubscriptionStats";
import { MobilePaymentHistory } from "./section/management/MobilePaymentHistory";

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
  if (pathname.includes("/subscription/overview")) return "overview";
  return "management";
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

const ManagementTabPage = memo(() => {
  useOptimizedPerformanceMonitor("ManagementTabPageMobile");
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SubscriptionTabKey>(() => getTabKeyFromPath(location.pathname));

  const { subscriptionStatus, isLoading, refreshSubscriptionStatus } = useOptimizedSubscription();

  useEffect(() => {
    setActiveTab(getTabKeyFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = useCallback(
    (tab: SubscriptionTabKey) => {
      setActiveTab(tab);
      navigate(TABS[tab]);
    },
    [navigate],
  );

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
          <main className="flex-1 bg-background pb-24 flex flex-col">
            <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border">
              <SidebarTrigger />
              <div className="text-sm font-semibold text-foreground">
                {t("subscription.management.pageTitleShort", "Subscription Management")}
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

ManagementTabPage.displayName = "ManagementTabPage";

export default ManagementTabPage;
