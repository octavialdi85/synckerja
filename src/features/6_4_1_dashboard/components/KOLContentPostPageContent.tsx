import { useState, useCallback, useMemo } from 'react';
import { KOLContentPostFilters, type KOLContentPostFiltersType } from '../section/KOLContentPostFilters';
import { KOLContentPostMetricsCards } from './KOLContentPostMetricsCards';
import { KOLContentPostTable } from './KOLContentPostTable';
import { KOLContentPostOverview } from './KOLContentPostOverview';
import AddContentPostModal from '../modals/AddContentPostModal';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useKOLCampaignAssignments } from '@/hooks/organized/utils';
import { useEnhancedKOLContentPosts } from '../hooks/useEnhancedKOLContentPosts';

export const KOLContentPostPageContent = () => {
  const { t } = useAppTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<KOLContentPostFiltersType>({
    search: '',
    campaign: 'all',
    platform: 'all',
    status: 'all',
    contentType: 'all'
  });

  const { assignments } = useKOLCampaignAssignments();
  const { createContentPostWithPayment, isCreating } = useEnhancedKOLContentPosts();

  // Ensure assignments is always an array
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  // Prepare campaign options for filter
  const campaignOptions = useMemo(() => {
    return safeAssignments.map((assignment) => ({
      id: assignment.id,
      name: assignment.campaign?.name || '',
      kolName: assignment.kol_profile?.name || ''
    }));
  }, [safeAssignments]);

  const handleFilterChange = useCallback((key: keyof KOLContentPostFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      campaign: 'all',
      platform: 'all',
      status: 'all',
      contentType: 'all'
    });
  }, []);

  const handleCreatePost = useCallback(async (data: any) => {
    await createContentPostWithPayment(data);
  }, [createContentPostWithPayment]);

  const handleOpenModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  return (
    <>
      {/* Grid Layout: 12 columns (9-3) - Same as KOLManagementPageContent */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* Main Content - 9 columns */}
        <div className="col-span-9 h-full">
          <div className="h-full flex flex-col">
            {/* Filter Section */}
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <KOLContentPostFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  onCreatePost={handleOpenModal}
                  campaignOptions={campaignOptions}
                />
              </div>
            </div>
            
            {/* Metrics Cards Section */}
            <div className="flex-shrink-0 mb-2">
              <KOLContentPostMetricsCards />
            </div>
            
            {/* Table Section - Main Content */}
            <div className="flex-1 min-h-0">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                <KOLContentPostTable />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Overview Sidebar (25% like kol-management page) */}
        <div className="col-span-3 h-full">
          <div className="h-full flex flex-col">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
              {/* Sidebar Header */}
              <div className="px-4 py-1.5 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('kolContentPost.overview.title', 'Content Performance Dashboard')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('kolContentPost.overview.description', 'Manager evaluation and content insights')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Sidebar Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full p-4 overflow-y-auto seamless-scroll max-h-[calc(100vh-200px)]">
                  <KOLContentPostOverview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal with Payment Terms */}
      <AddContentPostModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleCreatePost}
        isLoading={isCreating}
      />
    </>
  );
};
