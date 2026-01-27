import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/8-2-DailyTask/section/HeaderAndTab';
import { HabitTrackerProvider } from '../context/HabitTrackerContext';
import { HabitSpreadsheetView } from '../components/HabitSpreadsheetView';
import { HabitStats } from '../components/HabitStats';
import { HabitFilters } from '../components/HabitFilters';

const HabitTrackerPage = () => {
  return (
    <HabitTrackerProvider>
      <StandardLayout>
        <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
          <div className="flex-1 flex flex-col px-3 pb-3">
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab activeTab="habits-tracker" onTabChange={() => {}} />
            </div>
            <div className="flex-1 flex flex-col min-h-0 max-h-[calc(100vh-120px)]">
              <div className="flex-shrink-0 mb-0.5">
                <HabitStats />
              </div>
              <div className="flex-shrink-0 px-0 pb-0.5">
                <HabitFilters />
              </div>
              <div className="flex-1 min-h-0">
                <HabitSpreadsheetView />
              </div>
            </div>
          </div>
        </div>
      </StandardLayout>
    </HabitTrackerProvider>
  );
};

export default HabitTrackerPage;
