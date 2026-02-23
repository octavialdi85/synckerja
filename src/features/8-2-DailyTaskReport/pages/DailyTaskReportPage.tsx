import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/8-2-DailyTask/section/HeaderAndTab';
import { DailyTaskReportProvider, useDailyTaskReport } from '../context/ReportContext';
import { OverviewCards } from '../components/OverviewCards';
import { PerformanceTable } from '../components/PerformanceTable';
import { BlockersAndUpdatesPanel } from '../components/BlockersAndUpdatesPanel';
import { Filters } from '../components/Filters';

const DailyTaskReportContent = () => {
  const { refreshError, retryRefresh } = useDailyTaskReport();
  return (
    <>
      {refreshError && (
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 mb-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span>Data mungkin tidak terbarui.</span>
          <button type="button" onClick={retryRefresh} className="px-2 py-1 rounded border border-amber-300 bg-white hover:bg-amber-50 text-xs font-medium">
            Coba lagi
          </button>
        </div>
      )}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        <div className="col-span-9 flex flex-col min-h-0 max-h-[calc(100vh-120px)]">
          <div className="flex-shrink-0 mb-0.5">
            <OverviewCards />
          </div>
          <div className="flex-shrink-0 px-0 pb-0.5"><Filters /></div>
          {/* Single scroll container: inside PerformanceTable (table wrapper) */}
          <div className="flex-1 min-h-0">
            <PerformanceTable />
          </div>
        </div>
        <div className="col-span-3 flex flex-col gap-2 min-h-0 max-h-[calc(100vh-120px)]">
          <BlockersAndUpdatesPanel />
        </div>
      </div>
    </>
  );
};

const DailyTaskReportPage = () => {
  return (
    <DailyTaskReportProvider>
      <StandardLayout>
        <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
          <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab activeTab="daily-task-report" onTabChange={() => {}} />
            </div>
            <DailyTaskReportContent />
          </div>
        </div>
      </StandardLayout>
    </DailyTaskReportProvider>
  );
};

export default DailyTaskReportPage;
