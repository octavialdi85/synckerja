import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  PricingToolsHeaderAndTab,
  PricingToolsLayout,
  PricingToolsSidebar
} from '@/features/8_2_pricing-tools/components';

const PricingTools = () => {
  const [activeTab, setActiveTab] = useState('pricing');
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleCalculate = useCallback((results: any) => {
    setCalculationResults(results);
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

              {/* Grid Layout: 12 columns (9-3) */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    {/* Main Content Section */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                        {/* Scrollable Content */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <div className="h-full overflow-y-auto seamless-scroll px-4 py-6">
                            <PricingToolsLayout onCalculate={handleCalculate} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Sidebar (3 columns) */}
                <div className="col-span-3 h-full">
                  <PricingToolsSidebar calculationResults={calculationResults} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default PricingTools;
