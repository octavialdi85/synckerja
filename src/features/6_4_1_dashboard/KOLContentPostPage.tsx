import { useState, useCallback, useMemo } from 'react';
import {
  KOLContentPostFilters,
  type KOLContentPostFiltersType
} from './section';
import { KOLContentPostMetricsCards } from './components/KOLContentPostMetricsCards';
import { KOLContentPostTable } from './components/KOLContentPostTable';
import { KOLContentPostOverview } from './components/KOLContentPostOverview';
import { KOLContentPostSidebarFooter } from './section/KOLContentPostSidebarFooter';
import { useKOLContentPosts } from '@/hooks/organized/utils';
import { useKOLCampaignAssignments } from '@/hooks/organized/utils';
import AddContentPostModal from './modals/AddContentPostModal';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useEnhancedKOLContentPosts } from './hooks/useEnhancedKOLContentPosts';

export const KOLContentPostPage = () => {
  const { t } = useAppTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<KOLContentPostFiltersType>({
    search: '',
    campaign: 'all',
    platform: 'all',
    status: 'all',
    contentType: 'all'
  });

  const { contentPosts, isLoading } = useKOLContentPosts();
  const { assignments } = useKOLCampaignAssignments();
  const { createContentPostWithPayment, isCreating } = useEnhancedKOLContentPosts();

  // Ensure arrays are always arrays
  const safeContentPosts = Array.isArray(contentPosts) ? contentPosts : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  // Prepare campaign options for filter
  const campaignOptions = useMemo(() => {
    return safeAssignments.map((assignment) => ({
      id: assignment.id,
      name: assignment.campaign?.name || '',
      kolName: assignment.kol_profile?.name || ''
    }));
  }, [safeAssignments]);

  // Filter content posts
  const filteredContentPosts = useMemo(() => {
    let filtered = safeContentPosts;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(searchLower) ||
        post.caption?.toLowerCase().includes(searchLower) ||
        post.kol_profile?.name?.toLowerCase().includes(searchLower) ||
        post.campaign?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.campaign && filters.campaign !== 'all') {
      filtered = filtered.filter(post => post.campaign_assignment_id === filters.campaign);
    }
    
    if (filters.platform && filters.platform !== 'all') {
      filtered = filtered.filter(post => post.platform?.toLowerCase() === filters.platform.toLowerCase());
    }
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(post => post.status === filters.status);
    }
    
    if (filters.contentType && filters.contentType !== 'all') {
      filtered = filtered.filter(post => post.content_type?.toLowerCase() === filters.contentType.toLowerCase());
    }
    
    return filtered;
  }, [safeContentPosts, filters]);

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
    setIsAddModalOpen(false);
  }, [createContentPostWithPayment]);

  const handleOpenModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  // Calculate metrics for footer
  const postedPosts = useMemo(() => 
    filteredContentPosts.filter(post => post.status === 'posted').length, 
    [filteredContentPosts]
  );

  return (
    <>
      {/* Grid Layout: 12 columns (9-3) - Same as KOLManagementPage */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
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
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                <KOLContentPostTable 
                  contentPosts={filteredContentPosts} 
                  isLoading={isLoading}
                  selectedStatus={filters.status}
                />
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
                <div className="h-full p-4">
                  <KOLContentPostOverview 
                    contentPosts={filteredContentPosts}
                  />
                </div>
              </div>

              {/* Sidebar Footer */}
              <KOLContentPostSidebarFooter 
                totalPosts={filteredContentPosts.length}
                postedPosts={postedPosts}
                selectedStatus={filters.status || 'all'}
              />
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

export default KOLContentPostPage;
