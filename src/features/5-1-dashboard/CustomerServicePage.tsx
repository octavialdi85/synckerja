import { useState, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './HeaderAndTab';

export const CustomerServicePage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Determine active tab based on location
  const currentTab = location.pathname.includes('/tickets') ? 'tickets' : 'dashboard';

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
                  activeTab={currentTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};
