
import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StandardLayout } from "@/features/1-layouts/StandardLayout";
import { Tabs, TabsContent } from "@/features/ui/tabs";
import EnhancedServicesCalculator from "../components/EnhancedServicesCalculator";
import SalesCalculator from "../components/SalesCalculator";
import { CampaignCalculatorTutorial } from "../components/CampaignCalculatorTutorial";
import { ServiceKPISettings, SalesKPISettings } from "../types/kpi-templates";
import {
  HeaderAndTab,
  CampaignCalculatorMainFooter,
  CampaignCalculatorSidebarFooter
} from "../section";
import KPITemplateManager from "../components/KPITemplateManager";

const CampaignCalculator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Memoize route check to avoid recalculation
  const isCampaignCalculatorRoute = useMemo(() => 
    location.pathname === "/tools/campaign-calculator/services" ||
    location.pathname === "/tools/campaign-calculator/sales",
    [location.pathname]
  );
  
  // Memoize active tab from URL to avoid recalculation
  const activeTabFromUrl = useMemo<"services" | "sales">(() => {
    return location.pathname === "/tools/campaign-calculator/sales" ? "sales" : "services";
  }, [location.pathname]);
  
  // Use activeTabFromUrl as source of truth - no local state needed
  const activeTab = activeTabFromUrl;

  const [servicesSettings, setServicesSettings] = useState<ServiceKPISettings>({
    brandingBudget: "",
    brandingCpm: "",
    brandingFrequency: "",
    brandingEngagementRate: "",
    brandingQualificationRate: "",
    conversionFrequency: "",
    budget: "",
    cpm: "",
    ctrLink: "",
    adsClickToVisit: "",
    whatsappClick: "",
    prospectToClient: "",
    reservation: "",
    crossSelling: "",
    servicePackageValue: "",
    serviceProfitMargin: "",
    clientRetentionRate: "",
    remarketingAudienceSource: "manual",
    remarketingAudience: "",
  });
  const [salesSettings, setSalesSettings] = useState<SalesKPISettings>({
    budget: "",
    cpc: "",
    landingPageCtr: "",
    productViewRate: "",
    addToCartRate: "",
    checkoutRate: "",
    paymentSuccessRate: "",
    productPrice: "",
    avgOrderValue: "",
    profitMargin: "",
    repeatPurchaseRate: "",
    upsellRate: "",
    seasonalMultiplier: "",
  });

  const handleLoadServicesTemplate = useCallback((settings: ServiceKPISettings) => {
    setServicesSettings(settings);
  }, []);

  const handleLoadSalesTemplate = useCallback((settings: SalesKPISettings) => {
    setSalesSettings(settings);
  }, []);

  // Unified handler for tab changes - navigates to update URL (which updates activeTab)
  // Note: activeTab is derived from URL, so navigation automatically updates the UI
  const handleTabChange = useCallback((value: string) => {
    const tab = value as "services" | "sales";
    const targetPath = `/tools/campaign-calculator/${tab}`;
    
    // Always navigate to ensure URL and UI are in sync
    // This ensures tab clicks always work, even if already on the route
    navigate(targetPath, { replace: true });
  }, [navigate]);

  // Handler for HeaderAndTab - ensures tab clicks always navigate
  const handleHeaderTabChange = useCallback((tab: "services" | "sales") => {
    // Directly navigate to ensure immediate response
    const targetPath = `/tools/campaign-calculator/${tab}`;
    navigate(targetPath, { replace: true });
  }, [navigate]);

  // Handler for Tabs component - uses unified handleTabChange
  const handleTabsValueChange = handleTabChange;

  // Early return after all hooks - don't render if not on correct route
  if (!isCampaignCalculatorRoute) {
    return null;
  }

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab activeTab={activeTab} onTabChange={handleHeaderTabChange} />
              </div>

              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 mb-2">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="px-6 py-4">
                          <KPITemplateManager
                            calculatorType={activeTab}
                            currentSettings={activeTab === "services" ? servicesSettings : salesSettings}
                            onLoadTemplate={
                              activeTab === "services" ? handleLoadServicesTemplate : handleLoadSalesTemplate
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <div className="h-full overflow-y-auto seamless-scroll max-h-[calc(100vh-220px)]">
                            <div className="p-6">
                              <Tabs value={activeTab} onValueChange={handleTabsValueChange}>
                                <TabsContent value="services" className="mt-0">
                                  <EnhancedServicesCalculator
                                    key="services"
                                    initialSettings={servicesSettings}
                                    onSettingsChange={setServicesSettings}
                                  />
                                </TabsContent>
                                <TabsContent value="sales" className="mt-0">
                                  <SalesCalculator key="sales" />
                                </TabsContent>
                              </Tabs>
                            </div>
                          </div>
                        </div>
                        <CampaignCalculatorMainFooter activeTab={activeTab} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-3 h-full min-h-0">
                  <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] px-6 py-6">
                      <CampaignCalculatorTutorial currentTab={activeTab} />
                    </div>
                    <CampaignCalculatorSidebarFooter />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default CampaignCalculator;
