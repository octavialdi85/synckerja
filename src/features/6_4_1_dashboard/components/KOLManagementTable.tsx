import { memo, useMemo, useCallback, useState } from 'react';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { LoadingDots } from '@/components/LoadingDots';
import { Users } from 'lucide-react';
import { KOLManagementTableRow } from '../section/KOLManagementTableRow';
import { KOLManagementTableFooter } from '../section/KOLManagementTableFooter';
import { useKOLRatings } from '../hooks/useKOLRatings';
import { useKOLPostsAndMetrics } from '../hooks/useKOLPostsAndMetrics';
import { KOLProfileWithStats } from '@/hooks/useKOLManagementData';
import KOLDetailModal from '../modals/KOLDetailModal';
import { KOLRatingsModal } from '../modals/KOLRatingsModal';
import EnhancedEditKOLModal from '../modals/EnhancedEditKOLModal';
import './KOLManagementTable.css';

interface KOLManagementTableProps {
  profiles: KOLProfileWithStats[];
  isLoading?: boolean;
  selectedCategory?: string;
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
  onViewRatings?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export const KOLManagementTable = memo(({
  profiles = [],
  isLoading = false,
  selectedCategory,
  onViewDetails,
  onEdit,
  onViewRatings,
  onDelete
}: KOLManagementTableProps) => {
  const [selectedKOLId, setSelectedKOLId] = useState<string | null>(null);
  const [selectedKOLName, setSelectedKOLName] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Only fetch ratings when needed (lazy loading)
  const {
    getKOLRatings,
    getAverageRating
  } = useKOLRatings();

  // Only fetch metrics when needed (lazy loading)
  const {
    aggregatedMetrics,
    isLoading: metricsLoading
  } = useKOLPostsAndMetrics();

  // Helper functions for ratings
  const hasRating = useCallback((kolId: string) => {
    const ratings = getKOLRatings(kolId);
    return ratings.length > 0;
  }, [getKOLRatings]);

  const getPerformanceRating = useCallback((kolId: string) => {
    return getAverageRating(kolId).toFixed(1);
  }, [getAverageRating]);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  const handleViewDetails = useCallback((kolId: string) => {
    setSelectedKOLId(kolId);
    setIsDetailModalOpen(true);
    onViewDetails?.(kolId);
  }, [onViewDetails]);

  const handleViewRatings = useCallback((kolId: string, kolName: string) => {
    setSelectedKOLId(kolId);
    setSelectedKOLName(kolName);
    setIsRatingsModalOpen(true);
    onViewRatings?.(kolId, kolName);
  }, [onViewRatings]);

  const handleEdit = useCallback((kolId: string) => {
    setSelectedKOLId(kolId);
    setIsEditModalOpen(true);
    onEdit?.(kolId);
  }, [onEdit]);

  const handleDelete = useCallback(async (kolId: string) => {
    if (window.confirm('Are you sure you want to delete this KOL profile?')) {
      try {
        await onDelete?.(kolId);
        console.log('KOL deleted successfully');
      } catch (error) {
        console.error('Error deleting KOL:', error);
      }
    }
  }, [onDelete]);

  // Memoize the table headers to prevent re-renders
  const tableHeaders = useMemo(() => [
    { key: 'kol', label: 'KOL', width: 'w-64' },
    { key: 'contact', label: 'Contact', width: 'w-48' },
    { key: 'category', label: 'Category', width: 'w-40' },
    { key: 'social', label: 'Social Stats', width: 'w-48' },
    { key: 'rate', label: 'Rate Range', width: 'w-40' },
    { key: 'performance', label: 'Performance', width: 'w-32' },
    { key: 'posts', label: 'Posts', width: 'w-32' },
    { key: 'campaigns', label: 'Campaigns', width: 'w-36' },
    { key: 'status', label: 'Status', width: 'w-40' },
    { key: 'actions', label: 'Actions', width: 'w-20' },
  ], []);

  // Calculate active KOLs
  const activeKOLs = useMemo(() => {
    return profiles.filter(p => p.status?.toLowerCase() === 'active').length;
  }, [profiles]);

  const renderKOLRows = useMemo(() => (
    profiles.map((profile) => (
      <KOLManagementTableRow
        key={profile.id}
        profile={profile}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onViewRatings={handleViewRatings}
        onDelete={handleDelete}
        hasRating={hasRating}
        getPerformanceRating={getPerformanceRating}
        formatNumber={formatNumber}
        activePosts={aggregatedMetrics?.activePosts || 0}
      />
    ))
  ), [profiles, handleViewDetails, handleEdit, handleViewRatings, handleDelete, hasRating, getPerformanceRating, formatNumber, aggregatedMetrics]);

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto">
          <table className="w-full caption-bottom text-sm kol-management-table">
            <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="hover:bg-transparent">
                {tableHeaders.map((header) => (
                  <TableHead key={header.key} className={`text-xs font-medium text-gray-700 ${header.width} px-3 bg-gray-50 whitespace-nowrap`}>
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <LoadingDots size="lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500 text-sm">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="h-12 w-12 text-gray-300" />
                      <div>No KOL profiles found</div>
                      <div className="text-xs text-gray-400">Try adjusting your filters or search terms</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                renderKOLRows
              )}
            </TableBody>
          </table>
        </div>

        {/* Table Footer */}
        <KOLManagementTableFooter 
          totalKOLs={profiles.length}
          activeKOLs={activeKOLs}
          filteredKOLs={profiles.length}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Modals */}
      <KOLDetailModal 
        open={isDetailModalOpen} 
        onOpenChange={setIsDetailModalOpen} 
        kolId={selectedKOLId} 
      />

      <KOLRatingsModal 
        isOpen={isRatingsModalOpen} 
        onClose={() => setIsRatingsModalOpen(false)} 
        kolId={selectedKOLId || ''} 
        kolName={selectedKOLName} 
      />

      <EnhancedEditKOLModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
        kolId={selectedKOLId} 
      />
    </>
  );
});

KOLManagementTable.displayName = 'KOLManagementTable';
