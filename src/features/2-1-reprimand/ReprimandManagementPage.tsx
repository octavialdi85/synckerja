import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './HeaderAndTab';
import { ReprimandManagementMain } from './ReprimandManagementMain.tsx';
import ReprimandManagementOverview from './ReprimandManagementOverview';

export const ReprimandManagementPage = () => {
  const [activeTab, setActiveTab] = useState('reprimand');
  
  // Mock data for overview - will be replaced by actual data from ReprimandManagementMain
  const employees: any[] = [];
  const reprimands: any[] = [];

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Following EmployeePage structure that works perfectly
  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content - EXACT SAME STRUCTURE AS EMPLOYEE PAGE */}
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
                {/* Header and Tabs - Top Section like EmployeePage */}
                <div className="flex-shrink-0 mb-2 mt-4">
                  <HeaderAndTab 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                  />
                </div>

                {/* Main Layout - Following employee page grid pattern */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Left Column - Main Content (75% like employee page) */}
                  <div className="col-span-9 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <ReprimandManagementMain />
                    </div>
                  </div>

                  {/* Right Column - Overview Sidebar (25% like employee page) */}
                  <div className="col-span-3 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <ReprimandManagementOverview 
                        reprimands={reprimands}
                        employees={employees}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};