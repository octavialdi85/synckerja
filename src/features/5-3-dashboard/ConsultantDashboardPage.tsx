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
            <div className="h-full flex flex-col overflow-hidden">
              {/* HeaderAndTab */}
              <div className="flex-shrink-0">
                <HeaderAndTab />
              </div>
              {/* Scroll halaman utama: agar saat sidebar mentok scroll bisa chain ke sini (rule 3.1) */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
                <ConsultantsPageContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

