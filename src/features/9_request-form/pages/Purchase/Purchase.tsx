import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab, PurchaseContent } from './section';
import { Toaster } from '@/features/ui/toaster';

const Purchase = () => {
  const [activeTab, setActiveTab] = useState('purchase');

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
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-h-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                  <PurchaseContent />
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

export default Purchase;
