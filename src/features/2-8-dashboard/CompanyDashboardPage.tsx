import React, { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './section';
import { CompanyProfileDashboard } from './CompanyProfileDashboard';

/**
 * Main page component for /company/dashboard route
 * This is the single entry point for the company dashboard page
 */
export const CompanyDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-2 sm:pb-4 overflow-hidden">
            <div className="h-full flex flex-col min-h-0 overflow-hidden">
              {/* Header and Tabs - Fixed */}
              <div className="flex-shrink-0 mb-1 px-1 sm:px-2">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
                <div className="min-h-full bg-white rounded-lg border border-gray-200 shadow-sm p-2 sm:p-4">
                  <CompanyProfileDashboard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default CompanyDashboardPage;

