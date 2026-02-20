import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";
import HRISSubscriptionPlansTab from "@/mobile/pages/subscription/section/HRISSubscriptionPlansTab";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const PlansTabPage = () => {
  useStatusBarStyle("light");
  useOptimizedPerformanceMonitor("PlansTabPageMobile");
  const { t } = useAppTranslation();
  const { activeTab, handleTabChange } = useSubscriptionTabs("plans");
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
                  <h1 className="text-base font-semibold text-foreground">{t("subscription.plans.title", "Subscription Plans")}</h1>
                  <p className="text-xs text-muted-foreground">{t("subscription.plans.description", "Choose the perfect plan for your organization")}</p>
                </div>
              </div>
              <div />
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0 flex flex-col">
                <div className="mx-auto w-full max-w-md px-2 pt-2 space-y-1 content-padding-above-nav-default">
                  <HRISSubscriptionPlansTab />
                </div>
              </div>
            </div>

            <SubscriptionBottomTabs activeTab={activeTab} onTabChange={handleTabChange} className="safe-area-bottom-lower" />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
};

export default PlansTabPage;
