import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
} from '@/features/2_2_dashboard/section';
import { IntervieweeTab } from './IntervieweeTab';

export const IntervieweesPage = () => {
  const [activeTab, setActiveTab] = useState('interviewees');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Main Content - min-w-0 so table horizontal scroll stays inside section */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4 overflow-hidden">
            <div className="h-full flex flex-col min-h-0 min-w-0">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area - Scrollable; overflow-x-hidden keeps table from escaping section */}
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden seamless-scroll max-h-[calc(100vh-120px)]">
                <div className="min-h-full min-w-0">
                  <IntervieweeTab />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};
