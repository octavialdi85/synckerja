import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './HeaderAndTab';
import { CRMDashboardContent } from './CRMDashboardContent';

export const CRMDashboardPage = () => {
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              {/* HeaderAndTab */}
              <div className="flex-shrink-0">
                <HeaderAndTab />
              </div>
              {/* Main Content */}
              <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
                <div className="min-h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <CRMDashboardContent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

