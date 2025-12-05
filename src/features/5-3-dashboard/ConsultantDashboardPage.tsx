import React from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { ConsultantsPageContent } from './ConsultantsPageContent';
import { HeaderAndTab } from './HeaderAndTab';

export const ConsultantDashboardPage = () => {
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
              <div className="flex-1 min-h-0">
                <ConsultantsPageContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

