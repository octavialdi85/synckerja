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
      {/* Grid: section utama (tabel) + sidebar kanan — scroll-chaining rule 3.1: satu scroll per panel */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full overflow-hidden">
        {/* Section utama - Tabel - 9 columns — rule 3.1 */}
        <div className="col-span-9 flex flex-col min-h-0 overflow-hidden">
          <div className="h-full flex flex-col min-h-0 overflow-hidden">
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
            <div className="flex-shrink-0 mb-2">
              <KOLContentPostMetricsCards />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <KOLContentPostTable />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar kanan - Overview — rule 3.1: satu scroll container (no nested scroll) */}
        <div className="col-span-3 flex flex-col min-h-0 overflow-hidden">
          <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-0">
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
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain p-4">
              <KOLContentPostOverview />
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
