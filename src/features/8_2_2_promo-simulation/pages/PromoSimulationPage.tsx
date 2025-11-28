import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { PricingToolsHeaderAndTab } from '@/features/8_2_pricing-tools/components';
import { PromoSimulationWithTutorial } from '@/features/8_2_2_promo-simulation/components';

const PromoSimulationPage = () => {
  const [activeTab, setActiveTab] = useState('promo');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
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
                <PricingToolsHeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                  {/* Scrollable Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full overflow-y-auto seamless-scroll px-4 py-6">
                      <PromoSimulationWithTutorial />
                    </div>
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

export default PromoSimulationPage;
