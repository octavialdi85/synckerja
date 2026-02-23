import React, { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { CompanyFilesFilters } from './CompanyFilesFilters';
import { CompanyFilesMetricsCards } from './CompanyFilesMetricsCards';
import { CompanyFilesTable } from './CompanyFilesTable';
import { CompanyFilesOverview } from './CompanyFilesOverview';
import { HeaderAndTab } from './HeaderAndTab';
import { FileUploadModal } from './files/FileUploadModal';

export const CompanyFilesPage = () => {
  const [activeTab, setActiveTab] = useState('files');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleUploadFile = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  return (
    <StandardLayout>
      <div className="h-full bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Grid Layout: 12 columns (9-3) */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    {/* Filter Section */}
                    <div className="flex-shrink-0 mb-2">
                      <div className="bg-white border rounded-md p-2">
                        <CompanyFilesFilters onUploadFile={handleUploadFile} />
                      </div>
                    </div>
                    
                    {/* Metrics Cards Section */}
                    <div className="flex-shrink-0 mb-2">
                      <CompanyFilesMetricsCards />
                    </div>
                    
                    {/* Table Section - Main Content */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                        <CompanyFilesTable onUploadFile={handleUploadFile} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Overview Sidebar (25% like employee page) */}
                <div className="col-span-3 h-full">
                  <div className="h-full flex flex-col">
                    <div className="bg-white border rounded-lg h-full flex flex-col max-h-[calc(100vh-120px)]">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex flex-col">
                          <h3 className="text-sm font-semibold text-gray-900">Files Overview</h3>
                          <p className="text-xs text-gray-500 mt-1">Recent uploads and file statistics</p>
                        </div>
                      </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <CompanyFilesOverview />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload File Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </StandardLayout>
  );
};
