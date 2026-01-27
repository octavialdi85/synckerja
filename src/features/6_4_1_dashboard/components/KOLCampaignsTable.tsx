import { memo, useState, useMemo, useCallback } from 'react';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { LoadingDots } from '@/components/LoadingDots';
import { useKOLCampaigns } from '../hooks/useKOLCampaigns';
import { useCampaignPerformanceMetrics } from '@/hooks/useCampaignPerformanceMetrics';
import AssignKOLModal from '../modals/AssignKOLModal';
import CampaignDetailsModal from '../modals/CampaignDetailsModal';
import EditCampaignModal from '../modals/EditCampaignModal';
import { KOLCampaignsTableFooter } from '../section/KOLCampaignsTableFooter';
import { KOLCampaignsTableRow } from '../section/KOLCampaignsTableRow';
import './KOLCampaignsTable.css';

interface KOLCampaignsTableProps {
  campaigns?: any[];
  isLoading?: boolean;
  selectedStatus?: string;
  onViewDetails?: (campaign: any) => void;
  onEdit?: (campaign: any) => void;
  onAssign?: (campaign: any) => void;
  onDelete?: (campaign: any) => void;
}

export const KOLCampaignsTable = memo(({ 
  campaigns: propCampaigns, 
  isLoading: propIsLoading, 
  selectedStatus,
  onViewDetails,
  onEdit,
  onAssign,
  onDelete
}: KOLCampaignsTableProps = {}) => {
  const { campaigns: hookCampaigns, isLoading: hookIsLoading, deleteCampaign } = useKOLCampaigns();
  const { getCampaignMetrics, isLoading: metricsLoading } = useCampaignPerformanceMetrics();
  const [assignModalCampaign, setAssignModalCampaign] = useState(null);
  const [detailsModalCampaign, setDetailsModalCampaign] = useState(null);
  const [editModalCampaign, setEditModalCampaign] = useState(null);

  const campaigns = propCampaigns || hookCampaigns;
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookIsLoading;

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // Function to determine if campaign should be active based on posts
  const getUpdatedCampaignStatus = useCallback((campaign: any) => {
    const metrics = getCampaignMetrics(campaign.id);
    // If campaign is in draft and has published posts, make it active
    if (campaign.status === 'draft' && metrics && metrics.publishedPosts > 0) {
      return 'active';
    }
    return campaign.status;
  }, [getCampaignMetrics]);

  const calculateROI = useCallback((campaign: any) => {
    if (!campaign.total_budget || !campaign.allocated_budget) return 'N/A';
    const roi = ((campaign.allocated_budget - campaign.total_budget) / campaign.total_budget) * 100;
    return `${roi.toFixed(1)}%`;
  }, []);

  const calculatePerformance = useCallback((campaignId: string) => {
    const metrics = getCampaignMetrics(campaignId);
    if (!metrics) return 0;
    
    // Calculate overall performance as average of reach, engagement, and conversion progress
    const avgProgress = (metrics.reachProgress + metrics.engagementProgress + metrics.conversionProgress) / 3;
    return Math.round(avgProgress);
  }, [getCampaignMetrics]);

  const formatCurrency = useCallback((amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }, []);

  const handleViewDetails = useCallback((campaign: any) => {
    setDetailsModalCampaign(campaign);
    onViewDetails?.(campaign);
  }, [onViewDetails]);

  const handleEditCampaign = useCallback((campaign: any) => {
    setEditModalCampaign(campaign);
    onEdit?.(campaign);
  }, [onEdit]);

  const handleAssignCampaign = useCallback((campaign: any) => {
    setAssignModalCampaign(campaign);
    onAssign?.(campaign);
  }, [onAssign]);

  const handleDeleteCampaign = useCallback((campaign: any) => {
    if (window.confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      deleteCampaign.mutate(campaign.id);
      onDelete?.(campaign);
    }
  }, [deleteCampaign, onDelete]);

  const tableHeaders = useMemo(() => [
    { key: 'name', label: 'Campaign Name', width: 'w-48' },
    { key: 'posts', label: 'Posts', width: 'w-32' },
    { key: 'status', label: 'Status', width: 'w-32' },
    { key: 'budget', label: 'Budget', width: 'w-40' },
    { key: 'total_budget', label: 'Total Budget', width: 'w-40' },
    { key: 'allocated_budget', label: 'Allocated Budget', width: 'w-40' },
    { key: 'remaining_budget', label: 'Remaining Budget', width: 'w-40' },
    { key: 'roi', label: 'ROI', width: 'w-32' },
    { key: 'target_reach', label: 'Target Reach', width: 'w-48' },
    { key: 'target_engagement', label: 'Target Engagement', width: 'w-48' },
    { key: 'target_conversion', label: 'Target Conversion', width: 'w-48' },
    { key: 'performance', label: 'Performance', width: 'w-48' },
    { key: 'start_date', label: 'Start Date', width: 'w-36' },
    { key: 'end_date', label: 'End Date', width: 'w-36' },
    { key: 'actions', label: 'Actions', width: 'w-20' },
  ], []);

  const activeCampaigns = useMemo(() => 
    campaigns.filter(c => getUpdatedCampaignStatus(c) === 'active').length, 
    [campaigns, getUpdatedCampaignStatus]
  );

  const renderCampaignRows = useMemo(() => (
    campaigns.map((campaign) => {
      const metrics = getCampaignMetrics(campaign.id);
      return (
        <KOLCampaignsTableRow
          key={campaign.id}
          campaign={campaign}
          metrics={metrics}
          onViewDetails={handleViewDetails}
          onEdit={handleEditCampaign}
          onAssign={handleAssignCampaign}
          onDelete={handleDeleteCampaign}
          getStatusColor={getStatusColor}
          getUpdatedCampaignStatus={getUpdatedCampaignStatus}
          calculateROI={calculateROI}
          calculatePerformance={calculatePerformance}
          formatCurrency={formatCurrency}
        />
      );
    })
  ), [campaigns, getCampaignMetrics, handleViewDetails, handleEditCampaign, handleAssignCampaign, handleDeleteCampaign, getStatusColor, getUpdatedCampaignStatus, calculateROI, calculatePerformance, formatCurrency]);

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto">
          <table className="w-full caption-bottom text-sm kol-campaigns-table">
            <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="hover:bg-transparent">
                {tableHeaders.map((header) => (
                  <TableHead 
                    key={header.key} 
                    className={`text-xs font-medium text-gray-700 ${header.width} px-3 bg-gray-50 whitespace-nowrap`}
                  >
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <LoadingDots size="lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-gray-500 text-sm">
                    <div className="flex flex-col items-center space-y-2">
                      <div>No campaigns found</div>
                      <div className="text-xs text-gray-400">Try adjusting your filters or search terms</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                renderCampaignRows
              )}
            </TableBody>
          </table>
        </div>
        {/* Table Footer */}
        <KOLCampaignsTableFooter 
          totalCampaigns={campaigns.length} 
          activeCampaigns={activeCampaigns} 
          filteredCampaigns={campaigns.length} 
          selectedStatus={selectedStatus} 
        />
      </div>

      {/* Modals */}
      {assignModalCampaign && (
        <AssignKOLModal
          open={!!assignModalCampaign}
          onOpenChange={(open) => !open && setAssignModalCampaign(null)}
          campaign={assignModalCampaign}
        />
      )}

      {detailsModalCampaign && (
        <CampaignDetailsModal
          open={!!detailsModalCampaign}
          onOpenChange={(open) => !open && setDetailsModalCampaign(null)}
          campaign={detailsModalCampaign}
        />
      )}

      {editModalCampaign && (
        <EditCampaignModal
          open={!!editModalCampaign}
          onOpenChange={(open) => !open && setEditModalCampaign(null)}
          campaign={editModalCampaign}
        />
      )}
    </>
  );
});

KOLCampaignsTable.displayName = 'KOLCampaignsTable';

export default KOLCampaignsTable;
