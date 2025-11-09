
import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"services" | "sales">("services");
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

  const handleLoadServicesTemplate = (settings: ServiceKPISettings) => {
    setServicesSettings(settings);
  };

  const handleLoadSalesTemplate = (settings: SalesKPISettings) => {
    setSalesSettings(settings);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "services" | "sales");
  };

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab activeTab={activeTab} onTabChange={handleTabChange} />
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
                              <Tabs value={activeTab} onValueChange={handleTabChange}>
                                <TabsContent value="services" className="mt-0">
                                  <EnhancedServicesCalculator
                                    initialSettings={servicesSettings}
                                    onSettingsChange={setServicesSettings}
                                  />
                                </TabsContent>
                                <TabsContent value="sales" className="mt-0">
                                  <SalesCalculator />
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
