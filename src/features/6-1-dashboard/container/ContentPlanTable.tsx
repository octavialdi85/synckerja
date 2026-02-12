import React, { useCallback, useMemo } from 'react';
import { ContentPlan, ContentType, Service, SubService, ContentPillar } from '../types/social-media';
import { TableHeader } from './table/TableHeader';
import { ContentPlanRow } from './table/ContentPlanRow';
import { LoadingDots } from '@/components/LoadingDots';
import type { DigitalMarketingEmployee } from '../hook/useDigitalMarketingEmployees';
import type { CreativeEmployee } from '../hook/useCreativeEmployees';

interface ApprovalAccess {
  approved: boolean;
  prodApproved: boolean;
  loading: boolean;
}

interface ContentPlanTableProps {
  contentPlans: ContentPlan[];
  contentTypes: ContentType[];
  services: Service[];
  subServices: SubService[];
  contentPillars: ContentPillar[];
  digitalEmployees?: DigitalMarketingEmployee[];
  creativeEmployees?: CreativeEmployee[];
  currentUserRole?: string | null;
  onSelectItem: (id: string, checked: boolean) => void;
  selectedItems: string[];
  onFieldChange: (id: string, field: string, value: any) => void | Promise<void>;
  onOpenBriefDialog: (id: string, brief: string | null) => void;
  onOpenTitleDialog: (id: string, title: string | null, approved?: boolean) => void;
  onContentTypeDataChange: () => void;
  onServiceDataChange: () => void;
  onContentPillarDataChange: () => void;
  loading?: boolean;
  approvalAccess?: ApprovalAccess; // Batch-checked approval access from parent
  requestApproval?: (plan: ContentPlan, oldStatus: string | null, oldApproved?: boolean, oldCompletionDate?: string | null) => boolean; // Hook untuk approval dengan task step
  handleUnapproval?: (planId: string) => Promise<void>; // Hook untuk un-approval dengan task step deletion
}

export const ContentPlanTable: React.FC<ContentPlanTableProps> = ({
  contentPlans,
  contentTypes,
  services,
  subServices,
  contentPillars,
  digitalEmployees = [],
  creativeEmployees = [],
  currentUserRole = null,
  onSelectItem,
  selectedItems,
  onFieldChange,
  onOpenBriefDialog,
  onOpenTitleDialog,
  loading = false,
  approvalAccess,
  requestApproval,
  handleUnapproval
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
      
      if (!currentPlan) {
        // Fallback if plan not found
        onFieldChange(id, 'status', value);
        return;
      }

      const oldStatus = currentPlan.status || null;
      const isChangingToApproved = value === 'Approved';
      const isChangingToNeedReview = value === 'Need Review';

      // Special handling untuk status change ke "Approved" dengan requestApproval hook
      if (isChangingToApproved && requestApproval) {
        // Check apakah perlu show modal untuk memilih daily task
        // Pass oldApproved dan oldCompletionDate untuk rollback jika modal dibatalkan
        const oldApproved = currentPlan.approved || false;
        const oldCompletionDate = currentPlan.completion_date || null;
        const shouldPreventUpdate = requestApproval(currentPlan, oldStatus, oldApproved, oldCompletionDate);
        if (shouldPreventUpdate) {
          // Prevent normal update, modal akan handle update setelah task dipilih
          return;
        }
      }

      // Special handling untuk status change dari "Approved" ke "Need Review" (un-approval)
      // Delete task_steps ketika status berubah dari "Approved" ke "Need Review"
      // NON-BLOCKING: jangan di-await supaya dropdown status tetap responsif
      if (isChangingToNeedReview && oldStatus === 'Approved' && handleUnapproval) {
        // Status berubah dari "Approved" ke "Need Review" - hapus task_steps di background
        handleUnapproval(id).catch((error) => {
          console.error('Error during unapproval task step deletion (table):', error);
        });
      }

      // If changing to "Request Revision", increment revision count
      if (value === 'Request Revision' && currentPlan.status !== 'Request Revision') {
        const newRevisionCount = (currentPlan.revision_count || 0) + 1;
        onFieldChange(id, 'status', value);
        onFieldChange(id, 'revision_count', newRevisionCount);
      } else {
        // Regular status change
        onFieldChange(id, 'status', value);
      }
    },
    [onFieldChange, contentPlans, requestApproval, handleUnapproval]
  );

  const handleProductionStatusChange = useCallback(
    (id: string, value: string | null) => {
      // Find the current plan to get current production status and revision count
      const currentPlan = contentPlans.find(plan => plan.id === id);
      
      if (currentPlan) {
        // If changing to "Request Revision", increment production revision count and clear completion date
        if (value === 'Request Revision') {
          // Only increment revision count if status is NOT already "Request Revision"
          const shouldIncrement = currentPlan.production_status !== 'Request Revision';
          const newProductionRevisionCount = shouldIncrement 
            ? (currentPlan.production_revision_count || 0) + 1
            : (currentPlan.production_revision_count || 0);
          
          console.log('🔄 handleProductionStatusChange: Setting to Request Revision', {
            planId: id,
            currentStatus: currentPlan.production_status,
            currentApproved: currentPlan.production_approved,
            newRevisionCount: newProductionRevisionCount,
            shouldIncrement
          });
          
          // Update all fields - these will be batched together (30ms debounce)
          // IMPORTANT: Always clear production_completion_date when status is "Request Revision"
          onFieldChange(id, 'production_status', value);
          
          // Only update revision count if we're incrementing it
          if (shouldIncrement) {
            onFieldChange(id, 'production_revision_count', newProductionRevisionCount);
          }
          
          // ALWAYS clear production_completion_date when status is "Request Revision"
          // This ensures it's cleared even if status was already "Request Revision"
          onFieldChange(id, 'production_completion_date', null);
          
          // Also reset production_approved and clear approved date
          onFieldChange(id, 'production_approved', false);
          onFieldChange(id, 'production_approved_date', null);
          
          console.log('✅ All fields queued for update (will be batched in 30ms)');
        } else {
          // Regular production status change (can be null for "No Status")
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
      <div className="w-full h-full seamless-scroll overflow-auto flex items-center justify-center">
        <LoadingDots size="lg" />
      </div>
    );
  }

  // Empty state
  if (contentPlans.length === 0) {
    return (
      <div className="w-full h-full seamless-scroll overflow-auto">
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
    <div className="w-full h-full seamless-scroll overflow-auto">
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
              digitalEmployees={digitalEmployees}
              creativeEmployees={creativeEmployees}
              currentUserRole={currentUserRole}
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
              approvalAccess={approvalAccess}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

