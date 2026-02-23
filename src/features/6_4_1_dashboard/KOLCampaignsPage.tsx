import { useState, useCallback, useMemo } from 'react';
import {
  KOLCampaignsFilters,
  type KOLCampaignsFiltersType
} from './section';
import KOLCampaignsMetricsCards from './components/KOLCampaignsMetricsCards';
import { KOLCampaignsTable } from './components/KOLCampaignsTable';
import { KOLCampaignsOverview } from './components/KOLCampaignsOverview';
import { KOLCampaignsSidebarFooter } from './section/KOLCampaignsSidebarFooter';
import { useKOLCampaigns } from './hooks/useKOLCampaigns';
import { useCampaignPerformanceMetrics } from '@/hooks/useCampaignPerformanceMetrics';
import CreateCampaignModal from './modals/CreateCampaignModal';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const KOLCampaignsPage = () => {
  const { t } = useAppTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<KOLCampaignsFiltersType>({
    search: '',
    status: 'all',
    budget: 'all',
    date: 'all'
  });

  const { campaigns, isLoading } = useKOLCampaigns();
  const { getCampaignMetrics } = useCampaignPerformanceMetrics();

  const getUpdatedCampaignStatus = useCallback((campaign: any) => {
    const metrics = getCampaignMetrics(campaign.id);
    // If campaign is in draft and has published posts, make it active
    if (campaign.status === 'draft' && metrics && metrics.publishedPosts > 0) {
      return 'active';
    }
    return campaign.status || 'draft';
  }, [getCampaignMetrics]);

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns || [];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(c => getUpdatedCampaignStatus(c) === filters.status);
    }
    
    return filtered;
  }, [campaigns, filters, getUpdatedCampaignStatus]);

  const handleFilterChange = useCallback((key: keyof KOLCampaignsFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      budget: 'all',
      date: 'all'
    });
  }, []);

  const handleNewCampaign = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  // Calculate active campaigns for footer
  const activeCampaigns = useMemo(() => 
    filteredCampaigns.filter(c => getUpdatedCampaignStatus(c) === 'active').length, 
    [filteredCampaigns, getUpdatedCampaignStatus]
  );

  return (
    <>
      {/* Grid: section utama (tabel) + sidebar kanan — scroll-chaining rule 3.1: satu scroll per panel */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full overflow-hidden">
        {/* Section utama - Tabel - 9 columns — rule 3.1 */}
        <div className="col-span-9 flex flex-col min-h-0 overflow-hidden">
          <div className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <KOLCampaignsFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  onNewCampaign={handleNewCampaign}
                />
              </div>
            </div>
            <div className="flex-shrink-0 mb-2">
              <KOLCampaignsMetricsCards />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <KOLCampaignsTable 
                  campaigns={filteredCampaigns} 
                  isLoading={isLoading}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar kanan - Overview — rule 3.1: satu scroll container */}
        <div className="col-span-3 flex flex-col min-h-0 overflow-hidden">
          <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-0">
            <div className="px-4 py-1.5 border-b flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('kolCampaigns.overview.title', 'Campaign Overview')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('kolCampaigns.overview.description', 'Summary of campaign data')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain p-4">
              <KOLCampaignsOverview 
                campaigns={filteredCampaigns}
                metrics={{
                  totalCampaigns: filteredCampaigns.length,
                  activeCampaigns: activeCampaigns,
                  totalBudget: filteredCampaigns.reduce((sum, c) => sum + (c.total_budget || 0), 0),
                  allocatedBudget: filteredCampaigns.reduce((sum, c) => sum + (c.allocated_budget || 0), 0),
                  remainingBudget: filteredCampaigns.reduce((sum, c) => sum + ((c.total_budget || 0) - (c.allocated_budget || 0)), 0)
                }}
              />
            </div>
            <KOLCampaignsSidebarFooter 
              totalCampaigns={filteredCampaigns.length}
              activeCampaigns={activeCampaigns}
              selectedStatus={filters.status || 'all'}
            />
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </>
  );
};

export default KOLCampaignsPage;
