import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/8-2-DailyTask/section/HeaderAndTab';
import { DailyTaskReportProvider } from '../context/ReportContext';
import { OverviewCards } from '../components/OverviewCards';
import { PerformanceTable } from '../components/PerformanceTable';
import { BlockersAndUpdatesPanel } from '../components/BlockersAndUpdatesPanel';
import { Filters } from '../components/Filters';

const DailyTaskReportPage = () => {
  return (
    <DailyTaskReportProvider>
      <StandardLayout>
        <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
          <div className="flex-1 flex flex-col px-3 pb-3">
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab activeTab="daily-task-report" onTabChange={() => {}} />
            </div>
            <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
              <div className="col-span-9 flex flex-col min-h-0 max-h-[calc(100vh-120px)]">
                <div className="flex-shrink-0 mb-2">
                  <OverviewCards />
                </div>
                <div className="flex-shrink-0 px-0 pb-1"><Filters /></div>
                <div className="flex-1 min-h-0 seamless-scroll">
                  <PerformanceTable />
                </div>
              </div>
              <div className="col-span-3 flex flex-col gap-2 min-h-0 max-h-[calc(100vh-120px)]">
                <BlockersAndUpdatesPanel />
              </div>
            </div>
          </div>
        </div>
      </StandardLayout>
    </DailyTaskReportProvider>
  );
};

export default DailyTaskReportPage;


