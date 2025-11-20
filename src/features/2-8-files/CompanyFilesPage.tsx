import React, { useState, useCallback } from 'react';
import { CompanyFilesFilters } from './CompanyFilesFilters';
import { CompanyFilesMetricsCards } from './CompanyFilesMetricsCards';
import { CompanyFilesTable } from './CompanyFilesTable';
import { CompanyFilesOverview } from './CompanyFilesOverview';
import { HeaderAndTab } from '@/features/2-8-dashboard/section';

export const CompanyFilesPage = () => {
  const [activeTab, setActiveTab] = useState('files');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
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

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="p-2 flex gap-2 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-full">
                  {/* Main Content */}
                  <div className="flex-1" style={{ flex: '1.8' }}>
                    {/* Filter Section */}
                    <CompanyFilesFilters />
                    
                    {/* Metrics Cards Section */}
                    <div className="mb-2">
                      <div className="grid grid-cols-4 gap-1">
                        <CompanyFilesMetricsCards />
                      </div>
                    </div>
                    
                    {/* Main Table */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative">
                      {/* Modern accent line */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-indigo-500/40 to-purple-500/30"></div>
                      
                      <CompanyFilesTable />
                    </div>
                  </div>
                  
                  {/* Sidebar */}
                  <div className="w-96 bg-white/90 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative" style={{ flex: 'none', width: '480px' }}>
                    {/* Subtle accent border */}
                    <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-400/30 to-purple-400/20"></div>
                    
                    <div className="p-3 border-b border-slate-100/80 bg-gradient-to-r from-blue-50/30 to-white">
                      <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">Files Storage Overview</h3>
                      <p className="text-xs text-slate-500">Recent uploads and file statistics</p>
                    </div>
                    
                    <div className="p-2">
                      <CompanyFilesOverview />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
