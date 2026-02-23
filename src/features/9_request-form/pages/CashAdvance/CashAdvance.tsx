import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab, CashAdvanceContent } from './section';
import { Toaster } from '@/features/ui/toaster';

const CashAdvance = () => {
  const [activeTab, setActiveTab] = useState('cash-advance');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative overscroll-none">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 overflow-hidden">
            <div className="h-full flex flex-col min-h-0">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <CashAdvanceContent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Toaster for notifications */}
      <Toaster />
    </StandardLayout>
  );
};

export default CashAdvance;
