import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/8-2-DailyTask/section/HeaderAndTab';

const DailyTaskReportPage = () => {
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex-1 flex flex-col px-4 pb-4">
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab activeTab="daily-task-report" onTabChange={() => {}} />
          </div>
          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 seamless-scroll overflow-auto">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Daily Task Report</h2>
            <p className="text-sm text-gray-600">Coming soon: summaries of on-time vs late completions, assignee performance, and step analytics.</p>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default DailyTaskReportPage;


