import React, { useCallback, useMemo } from 'react';
import { ContentPlan, ContentType, Service, SubService, ContentPillar } from '../types/social-media';
import { TableHeader } from './table/TableHeader';
import { ContentPlanRow } from './table/ContentPlanRow';
import { LoadingDots } from '@/components/LoadingDots';

interface ContentPlanTableProps {
  contentPlans: ContentPlan[];
  contentTypes: ContentType[];
  services: Service[];
  subServices: SubService[];
  contentPillars: ContentPillar[];
  onSelectItem: (id: string, checked: boolean) => void;
  selectedItems: string[];
  onFieldChange: (id: string, field: string, value: any) => void;
  onOpenBriefDialog: (id: string, brief: string | null) => void;
  onOpenTitleDialog: (id: string, title: string | null) => void;
  onContentTypeDataChange: () => void;
  onServiceDataChange: () => void;
  onContentPillarDataChange: () => void;
  loading?: boolean;
}

export const ContentPlanTable: React.FC<ContentPlanTableProps> = ({
  contentPlans,
  contentTypes,
  services,
  subServices,
  contentPillars,
  onSelectItem,
  selectedItems,
  onFieldChange,
  onOpenBriefDialog,
  onOpenTitleDialog,
  loading = false
}) => {
  // Helper function to filter sub-services based on service
  const getFilteredSubServices = useCallback(
    (serviceId: string | null): SubService[] => {
      if (!serviceId) return [];
      return subServices.filter((sub) => sub.service_id === serviceId);
    },
    [subServices]
  );

  // Format date time helper
  const formatDateTime = useCallback((date: string | Date): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Format date only helper
  const formatDateOnly = useCallback((date: string | Date): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  // Status change handlers with revision count logic
  const handleStatusChange = useCallback(
    (id: string, value: string) => {
      // Find the current plan to get current status and revision count
      const currentPlan = contentPlans.find(plan => plan.id === id);
      
      if (currentPlan) {
        // If changing to "Request Revision", increment revision count
        if (value === 'Request Revision' && currentPlan.status !== 'Request Revision') {
          const newRevisionCount = (currentPlan.revision_count || 0) + 1;
          onFieldChange(id, 'status', value);
          onFieldChange(id, 'revision_count', newRevisionCount);
        } else {
          // Regular status change
          onFieldChange(id, 'status', value);
        }
      } else {
        // Fallback if plan not found
        onFieldChange(id, 'status', value);
      }
    },
    [onFieldChange, contentPlans]
  );

  const handleProductionStatusChange = useCallback(
    (id: string, value: string) => {
      // Find the current plan to get current production status and revision count
      const currentPlan = contentPlans.find(plan => plan.id === id);
      
      if (currentPlan) {
        // If changing to "Request Revision", increment production revision count
        if (value === 'Request Revision' && currentPlan.production_status !== 'Request Revision') {
          const newProductionRevisionCount = (currentPlan.production_revision_count || 0) + 1;
          onFieldChange(id, 'production_status', value);
          onFieldChange(id, 'production_revision_count', newProductionRevisionCount);
        } else {
          // Regular production status change
          onFieldChange(id, 'production_status', value);
        }
      } else {
        // Fallback if plan not found
        onFieldChange(id, 'production_status', value);
      }
    },
    [onFieldChange, contentPlans]
  );

  const handleStatusContentChange = useCallback(
    (id: string, value: string) => {
      onFieldChange(id, 'status_content', value);
    },
    [onFieldChange]
  );

  const handleResetRevision = useCallback(
    (id: string, field: 'revision_count' | 'production_revision_count') => {
      onFieldChange(id, field, 0);
    },
    [onFieldChange]
  );

  const handleOpenLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="w-full seamless-scroll overflow-auto flex items-center justify-center" style={{ height: '100%', maxHeight: 'calc(100vh - 400px)', minHeight: '300px' }}>
        <LoadingDots size="lg" />
      </div>
    );
  }

  // Empty state
  if (contentPlans.length === 0) {
    return (
      <div className="w-full seamless-scroll overflow-auto" style={{ height: '100%', maxHeight: 'calc(100vh - 400px)' }}>
        <table className="w-full border-collapse table-fixed">
          <TableHeader />
          <tbody>
            <tr>
              <td colSpan={24} className="p-8 text-center text-gray-500">
                No content plans found. Create a new content plan to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full seamless-scroll overflow-auto" style={{ height: '100%', maxHeight: 'calc(100vh - 400px)' }}>
      <table className="w-full border-collapse table-fixed">
        <TableHeader />
        <tbody>
          {contentPlans.map((plan) => (
            <ContentPlanRow
              key={plan.id}
              plan={plan}
              contentTypes={contentTypes}
              services={services}
              subServices={subServices}
              contentPillars={contentPillars}
              selectedItems={selectedItems}
              onSelectItem={onSelectItem}
              onFieldChange={onFieldChange}
              onOpenBriefDialog={onOpenBriefDialog}
              onOpenTitleDialog={onOpenTitleDialog}
              onStatusChange={handleStatusChange}
              onProductionStatusChange={handleProductionStatusChange}
              onStatusContentChange={handleStatusContentChange}
              onResetRevision={handleResetRevision}
              onOpenLink={handleOpenLink}
              getFilteredSubServices={getFilteredSubServices}
              formatDateTime={formatDateTime}
              formatDateOnly={formatDateOnly}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

