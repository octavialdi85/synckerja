import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { SubscriptionBottomTabs, useSubscriptionTabs } from "@/mobile/pages/subscription/shared/SubscriptionTabs";
import HRISSubscriptionPlansTab from "@/mobile/pages/subscription/section/HRISSubscriptionPlansTab";
import { useOptimizedPerformanceMonitor } from "@/features/10-management/hooks/useOptimizedPerformanceMonitor";

const PlansTabPage = () => {
  useOptimizedPerformanceMonitor("PlansTabPageMobile");
  const { handleTabChange } = useSubscriptionTabs("plans");

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 bg-background pb-20 flex flex-col">
            <div className="sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border">
              <SidebarTrigger />
              <div className="text-sm font-semibold text-foreground">Subscription Plans</div>
            </div>
            <div className="px-3 pt-4 pb-6 space-y-3">
              <HRISSubscriptionPlansTab />
            </div>
            <SubscriptionBottomTabs activeTab="plans" onTabChange={handleTabChange} />
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
};

export default PlansTabPage;
