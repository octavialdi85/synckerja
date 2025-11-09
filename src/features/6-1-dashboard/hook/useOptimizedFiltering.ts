
import { useMemo } from 'react';
import { ContentPlan } from '../types/social-media';

export const useOptimizedFiltering = (
  contentPlans: ContentPlan[],
  searchTerm: string,
  statusFilter: string
) => {
  return useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return contentPlans.filter(plan => {
      // Search filter
      const serviceName = plan.service?.name || '';
      const matchesSearch = !searchTerm || (
        plan.title?.toLowerCase().includes(lowerSearchTerm) ||
        plan.brief?.toLowerCase().includes(lowerSearchTerm) ||
        serviceName.toLowerCase().includes(lowerSearchTerm)
      );

      // Status filter - updated to match English status values
      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "Need Review") {
          const primaryCondition = plan.status === "Need Review" && !plan.approved;
          const secondaryCondition = plan.approved && plan.production_status === "Need Review" && !plan.production_approved;
          matchesStatus = primaryCondition || secondaryCondition;
        } else if (statusFilter === "Request Revision") {
          matchesStatus = plan.status === "Request Revision" || plan.production_status === "Request Revision";
        } else if (statusFilter === "Approved") {
          matchesStatus = plan.status === "Approved" || plan.production_status === "Approved";
        } else if (statusFilter === "Ready To Post") {
          const hasGoogleDriveLink =
            plan.google_drive_link !== null &&
            plan.google_drive_link !== undefined &&
            String(plan.google_drive_link).trim().length > 0;
          matchesStatus =
            plan.approved === true &&
            plan.production_approved === true &&
            hasGoogleDriveLink &&
            plan.done === false;
        } else if (statusFilter === "Content Need Review") {
          const hasEmptyGoogleDriveLink =
            plan.google_drive_link === null ||
            plan.google_drive_link === undefined ||
            String(plan.google_drive_link).trim().length === 0;
          matchesStatus =
            plan.status === "Need Review" &&
            plan.approved === false &&
            hasEmptyGoogleDriveLink &&
            plan.production_approved === false &&
            plan.done === false;
        } else if (statusFilter === "Content Revision") {
          const hasEmptyGoogleDriveLink =
            plan.google_drive_link === null ||
            plan.google_drive_link === undefined ||
            String(plan.google_drive_link).trim().length === 0;
          matchesStatus =
            plan.status === "Request Revision" &&
            plan.approved === false &&
            hasEmptyGoogleDriveLink &&
            plan.production_approved === false &&
            plan.done === false;
        } else if (statusFilter === "Prod Revision") {
          const hasGoogleDriveLink =
            plan.google_drive_link !== null &&
            plan.google_drive_link !== undefined &&
            String(plan.google_drive_link).trim().length > 0;
          matchesStatus =
            plan.status === "Approved" &&
            plan.approved === true &&
            hasGoogleDriveLink &&
            plan.production_status === "Request Revision" &&
            plan.production_approved === false &&
            plan.done === false;
        } else if (statusFilter === "Prod Need Review") {
          const hasGoogleDriveLink =
            plan.google_drive_link !== null &&
            plan.google_drive_link !== undefined &&
            String(plan.google_drive_link).trim().length > 0;
          matchesStatus =
            plan.status === "Approved" &&
            plan.approved === true &&
            hasGoogleDriveLink &&
            plan.production_status === "Need Review" &&
            plan.production_approved === false &&
            plan.done === false;
        } else {
          matchesStatus = plan.status === statusFilter || plan.production_status === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [contentPlans, searchTerm, statusFilter]);
};
