import { useState, useCallback } from "react";
import { StandardLayout } from "@/features/1-layouts/StandardLayout";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { SalesHeaderAndTab } from "./components/SalesHeaderAndTab";
import { TutorialSidebar } from "./components/TutorialSidebar";
import CalculatorMainFooter from "./components/CalculatorMainFooter";
import SalesCalculator from "./components/SalesCalculator";
import { SalesKPISettings } from "../../8-3-CampaignCalculator/types/kpi-templates";

const CalculatorSalesPage = () => {
  const { t } = useAppTranslation();
  
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

  const handleLoadTemplate = useCallback((settings: SalesKPISettings) => {
    setSalesSettings(settings);
  }, []);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <SalesHeaderAndTab />
              </div>

              {/* Content Area with Grid Layout */}
              <div className="flex-1 min-h-0">
                <div className="grid grid-cols-12 gap-2 h-full min-h-0">
                  {/* Main Content Area */}
                  <div className="col-span-9 h-full min-h-0">
                    <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0">
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] px-6 py-6">
                          <div className="space-y-4 pb-4">
                            {/* Sales Calculator Wrapper */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-6">
                                <SalesCalculator
                                  initialSettings={salesSettings}
                                  onSettingsChange={(settings) => {
                                    setSalesSettings(settings);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CalculatorMainFooter activeTab="sales" />
                    </div>
                  </div>

                  {/* Tutorial Sidebar */}
                  <TutorialSidebar activeTab="sales" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default CalculatorSalesPage;

