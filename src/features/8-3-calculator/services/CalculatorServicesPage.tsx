import { useState, useCallback } from "react";
import { StandardLayout } from "@/features/1-layouts/StandardLayout";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { ServicesHeaderAndTab } from "./components/ServicesHeaderAndTab";
import { TutorialSidebar } from "./components/TutorialSidebar";
import CalculatorMainFooter from "./components/CalculatorMainFooter";
import EngagementCalculator from "./components/EngagementCalculator";
import TrafficCalculator from "./components/TrafficCalculator";
import ConversionCalculator from "./components/ConversionCalculator";
import { ServiceKPISettings } from "../../8-3-CampaignCalculator/types/kpi-templates";

const CalculatorServicesPage = () => {
  const { t } = useAppTranslation();

  const [servicesSettings, setServicesSettings] = useState<ServiceKPISettings>({
    brandingBudget: "",
    brandingCpm: "",
    brandingFrequency: "",
    brandingEngagementRate: "",
    brandingQualificationRate: "",
    conversionFrequency: "",
    budget: "",
    cpm: "",
    cpc: "",
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
    adType: "meta",
  });

  const [brandingWarmAudience, setBrandingWarmAudience] = useState<number>(0);
  const [trafficWebsiteVisitors, setTrafficWebsiteVisitors] = useState<number>(0);

  const handleLoadTemplate = useCallback((settings: ServiceKPISettings) => {
    // Ensure all Traffic Calculator fields are included when loading template
    setServicesSettings({
      ...settings,
      // Ensure Traffic Calculator fields have default values if not present
      cpc: settings.cpc || '',
      adType: settings.adType || 'meta',
    });
  }, []);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col min-h-0">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <ServicesHeaderAndTab />
              </div>

              {/* Content Area with Grid Layout */}
              <div className="flex-1 min-h-0">
                <div className="grid grid-cols-12 gap-2 h-full min-h-0">
                  {/* Main Content Area */}
                  <div className="col-span-9 h-full min-h-0">
                    <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0">
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain px-6 py-6">
                          <div className="space-y-4 pb-4">
                            {/* Objective Engagement Wrapper */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-6">
                                <EngagementCalculator
                                  initialSettings={{
                                    brandingBudget: servicesSettings.brandingBudget,
                                    brandingCpm: servicesSettings.brandingCpm,
                                    brandingFrequency: servicesSettings.brandingFrequency,
                                    brandingEngagementRate: servicesSettings.brandingEngagementRate,
                                    brandingQualificationRate: "100",
                                  }}
                                  onSettingsChange={(settings) => {
                                    setServicesSettings(prev => ({
                                      ...prev,
                                      brandingBudget: settings.brandingBudget,
                                      brandingCpm: settings.brandingCpm,
                                      brandingFrequency: settings.brandingFrequency,
                                      brandingEngagementRate: settings.brandingEngagementRate,
                                    }));
                                  }}
                                  onWarmAudienceChange={setBrandingWarmAudience}
                                />
                              </div>
                            </div>

                            {/* Objective Traffic Wrapper */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-6">
                                <TrafficCalculator
                                  initialSettings={{
                                    budget: servicesSettings.budget,
                                    cpm: servicesSettings.cpm,
                                    cpc: servicesSettings.cpc,
                                    ctrLink: servicesSettings.ctrLink,
                                    adsClickToVisit: servicesSettings.adsClickToVisit,
                                    adType: servicesSettings.adType || 'meta',
                                  }}
                                  onSettingsChange={(settings) => {
                                    setServicesSettings(prev => ({
                                      ...prev,
                                      budget: settings.budget,
                                      cpm: settings.cpm,
                                      cpc: settings.cpc,
                                      ctrLink: settings.ctrLink,
                                      adsClickToVisit: settings.adsClickToVisit,
                                      adType: settings.adType,
                                    }));
                                  }}
                                  onWebsiteVisitorsChange={setTrafficWebsiteVisitors}
                                />
                              </div>
                            </div>

                            {/* Objective Conversion Wrapper */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-6">
                                <ConversionCalculator
                                  initialSettings={{
                                    conversionFrequency: servicesSettings.conversionFrequency,
                                    budget: servicesSettings.budget,
                                    cpm: servicesSettings.cpm,
                                    ctrLink: servicesSettings.ctrLink,
                                    adsClickToVisit: servicesSettings.adsClickToVisit,
                                    whatsappClick: servicesSettings.whatsappClick,
                                    prospectToClient: servicesSettings.prospectToClient,
                                    reservation: servicesSettings.reservation,
                                    crossSelling: servicesSettings.crossSelling,
                                    servicePackageValue: servicesSettings.servicePackageValue,
                                    serviceProfitMargin: servicesSettings.serviceProfitMargin,
                                    clientRetentionRate: servicesSettings.clientRetentionRate,
                                    remarketingAudienceSource: servicesSettings.remarketingAudienceSource,
                                    remarketingAudience: servicesSettings.remarketingAudience,
                                  }}
                                  onSettingsChange={(settings) => {
                                    setServicesSettings(prev => ({
                                      ...prev,
                                      conversionFrequency: settings.conversionFrequency,
                                      budget: settings.budget,
                                      cpm: settings.cpm,
                                      ctrLink: settings.ctrLink,
                                      adsClickToVisit: settings.adsClickToVisit,
                                      whatsappClick: settings.whatsappClick,
                                      prospectToClient: settings.prospectToClient,
                                      reservation: settings.reservation,
                                      crossSelling: settings.crossSelling,
                                      servicePackageValue: settings.servicePackageValue,
                                      serviceProfitMargin: settings.serviceProfitMargin,
                                      clientRetentionRate: settings.clientRetentionRate,
                                      remarketingAudienceSource: settings.remarketingAudienceSource,
                                      remarketingAudience: settings.remarketingAudience,
                                    }));
                                  }}
                                  brandingWarmAudience={brandingWarmAudience}
                                  trafficWebsiteVisitors={trafficWebsiteVisitors}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CalculatorMainFooter activeTab="services" />
                    </div>
                  </div>

                  {/* Tutorial Sidebar */}
                  <TutorialSidebar activeTab="services" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default CalculatorServicesPage;

