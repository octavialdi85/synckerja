import { useState, useCallback } from 'react';
import { KOLManagementFilters, type KOLManagementFiltersType } from '../section/KOLManagementFilters';
import { KOLManagementMetricsCards } from './KOLManagementMetricsCards';
import { KOLManagementTable } from './KOLManagementTable';
import { KOLManagementOverview } from './KOLManagementOverview';
import { useKOLManagementData } from '../hooks/useKOLManagementData';
import EnhancedAddKOLModal from '../modals/EnhancedAddKOLModal';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const KOLManagementPageContent = () => {
  const { t } = useAppTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<KOLManagementFiltersType>({
    search: '',
    category: 'all',
    platform: 'all',
    status: 'all',
    performance: 'all'
  });

  const { filteredProfiles, metrics, isLoading } = useKOLManagementData(filters);

  const handleFilterChange = useCallback((key: keyof KOLManagementFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'all',
      platform: 'all',
      status: 'all',
      performance: 'all'
    });
  }, []);

  const handleAddKOL = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  return (
    <>
      {/* Grid Layout: 12 columns (9-3) - Same as EmployeePage */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* Main Content - 9 columns */}
        <div className="col-span-9 h-full">
          <div className="h-full flex flex-col">
            {/* Filter Section */}
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <KOLManagementFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  onAddKOL={handleAddKOL}
                />
              </div>
            </div>
            
            {/* Metrics Cards Section */}
            <div className="flex-shrink-0 mb-2">
              <KOLManagementMetricsCards metrics={metrics} isLoading={isLoading} />
            </div>
            
            {/* Table Section - Main Content */}
            <div className="flex-1 min-h-0">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                <KOLManagementTable profiles={filteredProfiles} isLoading={isLoading} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Overview Sidebar (25% like employee page) */}
        <div className="col-span-3 h-full">
          <div className="h-full flex flex-col">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
              {/* Sidebar Header */}
              <div className="px-4 py-1.5 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('kolManagement.overview.title', 'KOL Overview')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('kolManagement.overview.description', 'Summary of KOL data')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Sidebar Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full p-4 overflow-y-auto seamless-scroll max-h-[calc(100vh-200px)]">
                  <KOLManagementOverview metrics={metrics} profiles={filteredProfiles} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Add KOL Modal */}
      <EnhancedAddKOLModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
      />
    </>
  );
};
