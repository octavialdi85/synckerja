import { useState, useCallback, useRef } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  PricingToolsHeaderAndTab,
  PricingToolsLayout,
  PricingToolsSidebar
} from '@/features/8_2_pricing-tools/components';
import { CalculationHistoryViewer } from '../components/CalculationHistoryViewer';
import { MultipleProductComparison } from '../components/MultipleProductComparison';
import { PricingCalculationResult, PricingCalculationInput } from '../types/pricingTypes';
import { SavedCalculation } from '../hooks/usePricingCalculations';
import type { PricingWizardRef } from '../components/PricingWizard';
import { History, GitCompare, Calculator } from 'lucide-react';
import { Button } from '@/features/ui/button';

const PricingTools = () => {
  const [activeTab, setActiveTab] = useState('pricing');
  const [activeView, setActiveView] = useState<'calculator' | 'history' | 'comparison'>('calculator');
  const [calculationResults, setCalculationResults] = useState<PricingCalculationResult | null>(null);
  const [calculationInput, setCalculationInput] = useState<PricingCalculationInput | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [finalSellingPrice, setFinalSellingPrice] = useState<number | undefined>(undefined);
  const [marketingCostPerUnit, setMarketingCostPerUnit] = useState<number | undefined>(undefined);
  const [channelFeePercent, setChannelFeePercent] = useState<number | undefined>(undefined);
  const [baseTotalCostPerUnit, setBaseTotalCostPerUnit] = useState<number | undefined>(undefined);
  const wizardRef = useRef<PricingWizardRef>(null);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleCalculate = useCallback((results: PricingCalculationResult, input: PricingCalculationInput) => {
    setCalculationResults(results);
    setCalculationInput(input);
  }, []);

  const handleStepChange = useCallback((data: {
    currentStep: number;
    finalSellingPrice?: number;
    marketingCostPerUnit?: number;
    channelFeePercent?: number;
    baseTotalCostPerUnit?: number;
  }) => {
    setCurrentStep(data.currentStep);
    setFinalSellingPrice(data.finalSellingPrice);
    setMarketingCostPerUnit(data.marketingCostPerUnit);
    setChannelFeePercent(data.channelFeePercent);
    setBaseTotalCostPerUnit(data.baseTotalCostPerUnit);
  }, []);

  const handleLoadCalculation = useCallback((calculation: SavedCalculation) => {
    // First, switch to calculator view
    setActiveView('calculator');
    
    // Then, wait for the component to render before loading the calculation
    setTimeout(() => {
      if (wizardRef.current) {
        wizardRef.current.loadCalculation(calculation);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // If wizardRef not yet available, load will be retried on next mount
    }, 100);
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

              {/* View Switcher (for pricing tab) */}
              {activeTab === 'pricing' && (
                <div className="flex-shrink-0 mb-2">
                  <div className="flex gap-2 px-1">
                    <Button
                      variant={activeView === 'calculator' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveView('calculator')}
                      className="text-xs"
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Calculator
                    </Button>
                    <Button
                      variant={activeView === 'history' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveView('history')}
                      className="text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      History
                    </Button>
                    <Button
                      variant={activeView === 'comparison' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveView('comparison')}
                      className="text-xs"
                    >
                      <GitCompare className="h-3 w-3 mr-1" />
                      Comparison
                    </Button>
                  </div>
                </div>
              )}

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
                            {activeTab === 'pricing' && activeView === 'calculator' && (
                              <PricingToolsLayout 
                                ref={wizardRef} 
                                onCalculate={handleCalculate}
                                onStepChange={handleStepChange}
                              />
                            )}
                            {activeTab === 'pricing' && activeView === 'history' && (
                              <CalculationHistoryViewer onLoadCalculation={handleLoadCalculation} />
                            )}
                            {activeTab === 'pricing' && activeView === 'comparison' && (
                              <MultipleProductComparison 
                                currentCalculation={
                                  calculationResults
                                    ? {
                                        name: calculationInput?.productName || 'Current Calculation',
                                        result: calculationResults,
                                      }
                                    : null
                                }
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Sidebar (3 columns) */}
                <div className="col-span-3 h-full">
                  {activeView === 'calculator' ? (
                    <PricingToolsSidebar 
                      calculationResults={calculationResults} 
                      calculationInput={calculationInput || undefined}
                      currentStep={currentStep}
                      finalSellingPrice={finalSellingPrice}
                      marketingCostPerUnit={marketingCostPerUnit}
                      channelFeePercent={channelFeePercent}
                      baseTotalCostPerUnit={baseTotalCostPerUnit}
                    />
                  ) : (
                    <div className="h-full space-y-2">
                      {activeView === 'history' && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          <p>Select a calculation from the list to load it into the calculator</p>
                        </div>
                      )}
                      {activeView === 'comparison' && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          <p>Select products from the list to compare them</p>
                        </div>
                      )}
                    </div>
                  )}
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
