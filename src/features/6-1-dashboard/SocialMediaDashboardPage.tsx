import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from "@/features/ui/tabs";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/config/logger';
import { useQuery } from '@tanstack/react-query';
import { StandardLayout } from "@/features/1-layouts/StandardLayout";
import { SocialMediaErrorBoundary } from "./hook/ErrorBoundary";
import { RealtimeSocialMediaProvider } from "./hook/RealtimeSocialMediaProvider";
import OptimizedErrorBoundary from "@/features/6-1-dashboard/OptimizedErrorBoundary";
import { PICFilterProvider } from "./PICFilterContext";

import { HeaderAndTab } from './container/HeaderAndTab';
import { SocialMediaMetrics } from './container/SocialMediaMetrics';
import { SocialMediaPerformanceTabs } from './container/SocialMediaPerformanceTabs';
import { SocialMediaFilters } from './container/SocialMediaFilters';
import { ContentPlanTable } from './container/ContentPlanTable';
import { TableFooter } from './container/TableFooter';
import { SidebarContainer } from './container/RightSection/SidebarContainer';
import { DashboardLoadingWrapper } from './container/DashboardLoadingWrapper';

import BriefDialog from './modal/BriefDialog';
import TitleDialog from './modal/TitleDialog';
import EditTargetDialog from './modal/EditTargetDialog';

// Import optimized hooks
import { useSocialMediaData, useSocialMediaMutations } from "./hook/useOptimizedSocialMediaState";
import { useContentPlannerEmployees } from "./hook/useContentPlannerEmployees";
import { useCreativeProductionEmployees } from "./hook/useCreativeProductionEmployees";
import { useOptimizedFiltering } from "./hook/useOptimizedFiltering";
import { useUserData } from "./hook/useUserData";
import { useDigitalMarketingEmployees } from "./hook/useDigitalMarketingEmployees";
import { useCreativeEmployees } from "./hook/useCreativeEmployees";
import { useCurrentEmployee } from "@/features/share/hooks/useCurrentEmployee";
import { useBatchApprovalAccess } from "./hook/useBatchApprovalAccess";
import { useSyncPicProduction } from "./hook/useSyncPicProduction";
import { useApprovalTaskStepCreation } from "./hook/useApprovalTaskStepCreation";
import DailyTaskSelectorDialog from "./modal/DailyTaskSelectorDialog";

const SocialMediaContent = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  
  // Get data from context
  const {
    contentPlans,
    contentTypes,
    services,
    subServices,
    contentPillars,
    isLoading: loading,
    organizationId,
    formatDisplayDate,
    getFilteredSubServices,
    getFilteredContentPlans
  } = useSocialMediaData();

  // Get mutations from context
  const {
    updateContentPlan,
    addContentPlan,
    deleteContentPlan,
    refreshAll,
    refreshMasterData
  } = useSocialMediaMutations();
  
  // Other data hooks
  const { contentPlanners } = useContentPlannerEmployees();
  const { creativeProductionMembers } = useCreativeProductionEmployees();
  const { profile } = useUserData();
  const { data: currentEmployee } = useCurrentEmployee(); // Get employee ID for pic_production_id
  const { data: digitalEmployees = [] } = useDigitalMarketingEmployees();
  const { data: creativeEmployees = [] } = useCreativeEmployees();
  
  // Sync PIC Production hook
  const { syncPicProduction, syncAllExistingPlans } = useSyncPicProduction();
  
  // Batch check approval access (optimized - single check for all rows)
  const approvalAccess = useBatchApprovalAccess();
  
  // Approval with task step creation hook
  const { 
    requestApproval, 
    isTaskSelectorOpen, 
    pendingApproval, 
    handleTaskSelected, 
    handleModalClose,
    handleUnapproval
  } = useApprovalTaskStepCreation({
    onStatusUpdate: async (planId: string, status: string) => {
      await updateContentPlan(planId, { status });
    },
    onUpdate: async (planId: string, fields: { status?: string | null; approved?: boolean; completion_date?: string | null }) => {
      // Update semua field setelah task step berhasil dibuat
      await updateContentPlan(planId, fields);
    },
    onRollback: async (planId: string, fields: { status?: string | null; approved?: boolean; completion_date?: string | null }) => {
      // Rollback semua field yang sudah diupdate
      await updateContentPlan(planId, fields);
    }
  });

  // Fetch all social media links for Content Post metrics (same logic as ContentPostTab)
  // Disabled polling - rely on realtime updates instead of refetchInterval
  const { data: allSocialMediaLinks = [] } = useQuery({
    queryKey: ['all-social-media-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_links')
        .select('*');
      
      if (error) {
        console.error('Error fetching social media links:', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds - data is fresh for 30s
    gcTime: 5 * 60 * 1000, // 5 minutes - keep cached data
    refetchInterval: false, // Disabled - realtime updates handle changes, no need for polling
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on focus - realtime handles updates
  });

  // State hooks
  const [activeMainTab, setActiveMainTab] = useState("dashboard");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [activePerformanceTab, setActivePerformanceTab] = useState("content-planner");

  // Date states for performance tabs and Content Pillar Tracker filter
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false);

  // Edit Target Dialog States
  const [isEditTargetOpen, setIsEditTargetOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<any>(null);
  const [targetType, setTargetType] = useState<'content_planning' | 'content_production' | 'content_posting'>('content_planning');

  // Brief and Title Dialog States
  const [briefDialog, setBriefDialog] = useState<{
    isOpen: boolean;
    id: string;
    brief: string | null;
  }>({
    isOpen: false,
    id: "",
    brief: null
  });
  const [titleDialog, setTitleDialog] = useState<{
    isOpen: boolean;
    id: string;
    title: string | null;
    approved?: boolean;
  }>({
    isOpen: false,
    id: "",
    title: null,
    approved: undefined
  });

  // Define tab configurations
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/digital-marketing/social-media/dashboard' },
    { id: 'content-calendar', label: 'Content Calendar', path: '/digital-marketing/social-media/content-calendar' },
    { id: 'settings', label: 'Settings', path: '/digital-marketing/social-media/settings' }
  ];

  // Set active tab based on URL parameter
  useEffect(() => {
    const validTabs = tabs.map(t => t.id);
    
    if (tab && validTabs.includes(tab)) {
      setActiveMainTab(tab);
    } else if (!tab) {
      // No tab specified, redirect to dashboard
      navigate('/digital-marketing/social-media/dashboard', { replace: true });
    }
  }, [tab, navigate]);

  // Sync existing plans on mount (only once when organizationId is available and data is loaded)
  // Use ref to prevent multiple syncs
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (!organizationId || loading || hasSyncedRef.current) return;
    
    // Mark as synced to prevent multiple calls
    hasSyncedRef.current = true;
    
    // Sync existing plans in background (don't block UI)
    // Add small delay to ensure data is loaded
    const timeoutId = setTimeout(() => {
      syncAllExistingPlans().catch(error => {
        console.error('Error syncing existing plans:', error);
        // Reset flag on error so it can retry
        hasSyncedRef.current = false;
        // Don't show error to user, just log it
      });
    }, 1000); // 1 second delay to ensure data is loaded
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [organizationId, loading, syncAllExistingPlans]);

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  // Filtered content plans - use empty array during loading to prevent flicker
  const filteredContentPlans = useOptimizedFiltering(
    loading ? [] : contentPlans, 
    searchTerm, 
    statusFilter,
    selectedMonth,
    serviceFilter
  );

  // Calculate metrics from contentPlans filtered by active performance tab
  // Return default metrics during loading to prevent flicker
  const metrics = React.useMemo(() => {
    // Return default metrics during initial load to prevent flicker
    if (loading || !contentPlans.length) {
      return {
        dailyOverdueContent: 0,
        dailyCompletedContent: 0,
        dailyRevisedContent: 0,
        dailyTotalContent: 0,
        monthlyOverdueContent: 0,
        monthlyCompletedContent: 0,
        monthlyRevisedContent: 0,
        monthlyTotalContent: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    // Use local date to avoid timezone issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`; // Format: YYYY-MM-DD (local timezone)
    
    // Use selectedMonth if provided, otherwise use current month
    const filterDate = selectedMonth || today;
    const currentMonth = filterDate.getMonth();
    const currentYear = filterDate.getFullYear();

    // Filter plans based on active performance tab
    let filteredPlans = contentPlans;
    
    if (activePerformanceTab === 'content-planner') {
      // Content Planner: Filter by pic_id (content planner PIC)
      filteredPlans = contentPlans.filter(plan => plan.pic_id !== null && plan.pic_id !== undefined);
    } else if (activePerformanceTab === 'production') {
      // Production: Filter by pic_production_id (production PIC)
      filteredPlans = contentPlans.filter(plan => plan.pic_production_id !== null && plan.pic_production_id !== undefined);
    } else if (activePerformanceTab === 'content-post') {
      // Content Post: Filter by pic_id (same as Content Planner, but metrics will check done or social_media_links)
      filteredPlans = contentPlans.filter(plan => plan.pic_id !== null && plan.pic_id !== undefined);
    }
    // else: show all plans (default behavior)

    // Helper function to extract date string from date value (robust parsing)
    const getDateString = (dateValue: string | Date | null | undefined): string | null => {
      if (!dateValue) return null;
      
      try {
        if (typeof dateValue === 'string') {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
          }
          // If contains 'T', split and take date part
          if (dateValue.includes('T')) {
            return dateValue.split('T')[0];
          }
          // If contains space, split and take date part (format: "YYYY-MM-DD HH:mm:ss")
          if (dateValue.includes(' ')) {
            return dateValue.split(' ')[0];
          }
          // Otherwise, try to parse it
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            // Use local date to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
        
        if (dateValue instanceof Date) {
          if (!isNaN(dateValue.getTime())) {
            // Use local date to avoid timezone issues
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      } catch (e) {
        // Silently fail and return null
      }
      
      return null;
    };

    // Filter plans by day - use today's date string for exact match
    // For Production tab, filter by production_completion_date or production_approved_date
    // For Content Post tab, filter by actual_post_date or post_date (same logic as ContentPostTab)
    // For Content Planner tab, filter by post_date
    const dailyContentPlans = filteredPlans.filter(plan => {
      if (activePerformanceTab === 'production') {
        // For Production: filter by production completion/approval date
        // Priority: production_approved_date > production_completion_date > post_date (if approved)
        // AND must have production_approved === true
        
        // Check production_approved_date first (most reliable)
        const approvedDateStr = getDateString(plan.production_approved_date);
        if (approvedDateStr && approvedDateStr === todayDateString && plan.production_approved === true) {
          return true;
        }

        // Check production_completion_date second
        const completionDateStr = getDateString(plan.production_completion_date);
        if (completionDateStr && completionDateStr === todayDateString && plan.production_approved === true) {
          return true;
        }

        // Fallback: if production_approved is true and post_date is today
        if (plan.production_approved === true && plan.post_date) {
          const postDateStr = getDateString(plan.post_date);
          if (postDateStr && postDateStr === todayDateString) {
            return true;
          }
        }

        return false;
      } else if (activePerformanceTab === 'content-post') {
        // For Content Post: Priority actual_post_date > post_date (same logic as ContentPostTab)
        // Check actual_post_date first (most reliable - when content was actually posted)
        if (plan.actual_post_date) {
          const actualPostDateStr = getDateString(plan.actual_post_date);
          if (actualPostDateStr && actualPostDateStr === todayDateString) {
            return true;
          }
        }

        // Fallback: check post_date if actual_post_date doesn't match or doesn't exist
        if (plan.post_date) {
          const postDateStr = getDateString(plan.post_date);
          if (postDateStr && postDateStr === todayDateString) {
            return true;
          }
        }

        return false;
      } else if (activePerformanceTab === 'content-planner') {
        // For Content Planner: Priority completion_date > post_date (same logic as ContentPlannerTab)
        // Check completion_date first (most reliable - this is when content planner approved)
        if (plan.completion_date) {
          const completionDateStr = getDateString(plan.completion_date);
          if (completionDateStr && completionDateStr === todayDateString) {
            return true;
          }
        }

        // Fallback: check post_date if completion_date doesn't match or doesn't exist
        if (plan.post_date) {
          const postDateStr = getDateString(plan.post_date);
          if (postDateStr && postDateStr === todayDateString) {
            return true;
          }
        }

        return false;
      } else {
        // Default: filter by post_date
      if (!plan.post_date) return false;
        const postDateStr = getDateString(plan.post_date);
        return postDateStr === todayDateString;
      }
    });

    // Filter plans by month
    const monthlyContentPlans = filteredPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getMonth() === currentMonth && 
             postDate.getFullYear() === currentYear;
    });

    // Helper function to calculate on-time status (same logic as ContentPlanRow)
    const calculateOnTimeStatus = (actualPostDate: string | null, postDate: string) => {
      if (!actualPostDate || !postDate) return '';
      
      try {
        const actual = new Date(actualPostDate);
        const planned = new Date(postDate);
        
        if (isNaN(actual.getTime()) || isNaN(planned.getTime())) {
          return '';
        }
        
        const diffTime = actual.getTime() - planned.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          return 'Ontime';
        } else {
          return `Late ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        }
      } catch (error) {
        return '';
      }
    };

    // Helper function to check if content is not completed based on tab
    const isNotCompleted = (plan: any) => {
      if (activePerformanceTab === 'content-planner') {
        // Content Planner: Not completed = belum Approved
        return plan.approved !== true;
      } else if (activePerformanceTab === 'production') {
        // Production: Not completed = belum Production Approved
        return plan.production_approved !== true;
      } else if (activePerformanceTab === 'content-post') {
        // Content Post: Not completed = belum selesai Post (done === false AND tidak ada links)
        const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
        return plan.done !== true && !hasLinks;
      } else {
        // Default: not completed if not approved
        return plan.approved !== true;
      }
    };

    // Helper function to calculate on-time status (same logic as ContentPlanRow)
    const calculateOnTimeStatusForPlan = (plan: any): string => {
      if (!plan.post_date) return '';
      
      // Determine actual post date (same logic as ContentPlanRow)
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      const actualPostDate = hasLinks ? new Date().toISOString().split('T')[0] : plan.actual_post_date;
      
      if (!actualPostDate) return '';
      
      try {
        const actual = new Date(actualPostDate);
        const planned = new Date(plan.post_date);
        
        if (isNaN(actual.getTime()) || isNaN(planned.getTime())) {
          return '';
        }
        
        const diffTime = actual.getTime() - planned.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          return 'Ontime';
        } else {
          return `Late ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        }
      } catch (error) {
        return '';
      }
    };

    // Helper function to check if content is late using On Time Status calculation
    // Content is late if calculated on_time_status contains "Late" (e.g., "Late 1 Day", "Late 2 Days")
    // and must be in current month (bulan yang sedang berjalan)
    const isLatePost = (plan: any) => {
      if (!plan.post_date) return false;
      
      // Calculate on_time_status in real-time (same logic as ContentPlanRow)
      const onTimeStatus = calculateOnTimeStatusForPlan(plan);
      
      // Check if calculated on_time_status contains "Late"
      if (!onTimeStatus || !onTimeStatus.includes('Late')) {
        return false;
      }
      
      // Determine actual post date for month check
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      const actualPostDate = hasLinks ? new Date().toISOString().split('T')[0] : plan.actual_post_date;
      
      if (!actualPostDate) return false;
      
      // Late Post must be in current month (bulan yang sedang berjalan)
      // Use actual_post_date to determine which month the content was posted
      const actualPostDateObj = new Date(actualPostDate);
      actualPostDateObj.setHours(0, 0, 0, 0);
      
      const isInCurrentMonth = actualPostDateObj.getMonth() === currentMonth && 
                               actualPostDateObj.getFullYear() === currentYear;
      if (!isInCurrentMonth) return false;
      
      // Content with "Late" on_time_status is considered late post
      return true;
    };

    // Helper function to check if content is approaching deadline
    // Works for all tabs: Content Planner, Production, and Content Post
    // Content approaching deadline: post_date in the next 7 days (today + 1 to today + 7) and not posted
    // Same logic for all tabs: content must not be done and must not have social media links
    // This ensures consistent "Upcoming Deadlines" value across all tabs
    const isApproachingDeadline = (plan: any) => {
      if (!plan.post_date) return false;
      
      const postDate = new Date(plan.post_date);
      postDate.setHours(0, 0, 0, 0);
      
      // Calculate days until deadline
      const daysUntilDeadline = Math.ceil((postDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Content is approaching deadline if post_date is between tomorrow and 7 days from now
      // AND in the current month (bulan yang sedang berjalan)
      const isInCurrentMonth = postDate.getMonth() === currentMonth && 
                               postDate.getFullYear() === currentYear;
      
      if (!isInCurrentMonth) return false;
      
      // Approaching deadline: 1 to 7 days from now (tomorrow to next week)
      const isApproaching = daysUntilDeadline >= 1 && daysUntilDeadline <= 7;
      if (!isApproaching) return false;
      
      // For "Upcoming Deadlines", use same logic for all tabs:
      // Content must not be posted (not done and no social media links)
      // This ensures the same value is displayed in Content Planner, Production, and Content Post tabs
      const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
      return plan.done !== true && !hasLinks;
    };

    // Helper function to check if content is overdue (includes both late post and approaching deadline)
    const isOverdue = (plan: any) => {
      if (!plan.post_date) return false;
      
      // Check if content is late post (post_date < today)
      if (isLatePost(plan)) return true;
      
      // Check if content is approaching deadline (1-7 days from now)
      if (isApproachingDeadline(plan)) return true;
      
      return false;
    };

    // For daily overdue, count only Late Post (post_date < today and not completed)
    const dailyLatePostPlans = filteredPlans.filter(plan => {
      if (!plan.post_date) return false;
      // Only count late post (post_date < today)
      return isLatePost(plan);
    });

    // For monthly overdue, count only Approaching Deadline (post_date in next 7 days and not completed)
    // IMPORTANT: Use all contentPlans (not filteredPlans) to ensure same value across all tabs
    // This ensures "Upcoming Deadlines" shows the same value in Content Planner, Production, and Content Post tabs
    // Only filter by approaching deadline logic (post_date in 1-7 days, not posted)
    const monthlyApproachingDeadlinePlans = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      // Only count approaching deadline (today + 1 to today + 7, in current month, not posted)
      // isApproachingDeadline uses same logic for all tabs (not done and no links)
      return isApproachingDeadline(plan);
    });

    const isCompleted = (plan: any) => {
      if (activePerformanceTab === 'content-planner') {
        return plan.approved === true || plan.done === true;
      } else if (activePerformanceTab === 'production') {
        // For Production: content is completed if production_approved is true
        // Note: dailyContentPlans already filtered by date, so we just need to check approval status
        return plan.production_approved === true || plan.done === true;
      } else if (activePerformanceTab === 'content-post') {
        // Content is completed if done=true OR has social media links (same logic as ContentPostTab)
        const hasLinks = allSocialMediaLinks.some(link => link.social_media_plan_id === plan.id);
        return plan.done === true || hasLinks;
      }
      return plan.approved === true || plan.done === true;
    };

    const needsRevision = (plan: any) => {
      if (activePerformanceTab === 'content-planner') {
        // Under Revision: Count if status is "Request Revisi" OR "Need Review"
        return plan.status === 'Request Revisi' || plan.status === 'Need Review';
      } else if (activePerformanceTab === 'production') {
        // Under Revision: Count if production_status is "Request Revision" OR "Need Review"
        return plan.production_status === 'Request Revision' || plan.production_status === 'Need Review';
      } else if (activePerformanceTab === 'content-post') {
        // Content post might not have revision status, return false for now
        return false;
      }
      return plan.status === 'Request Revisi' || plan.status === 'Need Review' || 
             plan.production_status === 'Request Revision' || plan.production_status === 'Need Review';
    };

    // For "Under Revision" daily, count content with Need Review or Request Revisi/Revision status
    // that have post_date matching today (post_date is the most reliable date for all content)
    // This is simpler and more consistent - all content has post_date, so we use that for daily filtering
    const dailyRevisedPlans = filteredPlans.filter(plan => {
      // First check if it has revision status
      if (!needsRevision(plan)) {
        return false;
      }
      
      // Then check if it has post_date matching today
      // post_date is the scheduled date and is present on all content, making it the most reliable filter
      if (!plan.post_date) return false;
      const postDateStr = getDateString(plan.post_date);
      return postDateStr === todayDateString;
    });

    return {
      dailyOverdueContent: dailyLatePostPlans.length,
      dailyCompletedContent: dailyContentPlans.filter(isCompleted).length,
      dailyRevisedContent: dailyRevisedPlans.length,
      dailyTotalContent: dailyContentPlans.length,
      monthlyOverdueContent: monthlyApproachingDeadlinePlans.length,
      monthlyCompletedContent: monthlyContentPlans.filter(isCompleted).length,
      monthlyRevisedContent: monthlyContentPlans.filter(needsRevision).length,
      monthlyTotalContent: monthlyContentPlans.length
    };
  }, [contentPlans, activePerformanceTab, allSocialMediaLinks, loading, selectedMonth]); // Add selectedMonth to recalculate when month filter changes

  // Callback handlers
  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    try {
      setSelectedItems(prev => checked ? [...prev, id] : prev.filter(item => item !== id));
    } catch (error) {
      console.error('Error in handleSelectItem:', error);
      toast.error('Error selecting item');
    }
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`)) {
      try {
        const deletePromises = selectedItems.map(id => deleteContentPlan(id));
        await Promise.all(deletePromises);
        setSelectedItems([]);
      } catch (error) {
        console.error("Error deleting items:", error);
        toast.error("Error deleting items");
      }
    }
  }, [selectedItems, deleteContentPlan]);

  // Batch updates for production_approved related fields to reduce database calls
  const pendingBatchUpdatesRef = useRef<Map<string, { updates: any; timeout: NodeJS.Timeout }>>(new Map());
  
  // Track plans yang sedang pending approval (untuk prevent multiple updates)
  const pendingApprovalPlansRef = useRef<Set<string>>(new Set());

  const handleFieldChange = useCallback(async (id: string, field: string, value: any) => {
    // Skip update jika plan sedang pending approval (dari previous approved/completion_date call)
    if (pendingApprovalPlansRef.current.has(id)) {
      // Clear flag setelah delay kecil untuk allow update setelah modal dibuka
      setTimeout(() => {
        pendingApprovalPlansRef.current.delete(id);
      }, 100);
      return;
    }

    try {
      // Special handling untuk approved toggle yang akan trigger status change ke "Approved"
      // Check jika perlu show modal untuk memilih daily task
      if (field === 'approved' && value === true) {
        const plan = contentPlans.find(p => p.id === id);
        if (plan) {
          const oldStatus = plan.status || null;
          const oldApproved = plan.approved || false;
          const oldCompletionDate = plan.completion_date || null;
          
          // Check apakah status akan berubah ke "Approved" (dari "Need Review" atau NULL)
          const willChangeToApproved = oldStatus === 'Need Review' || oldStatus === null || oldStatus === '' || oldStatus === 'none';
          
          if (willChangeToApproved) {
            // Request approval dengan old approved dan completion_date untuk rollback
            const shouldPreventUpdate = requestApproval(plan, oldStatus, oldApproved, oldCompletionDate);
            if (shouldPreventUpdate) {
              // Mark plan sebagai pending approval untuk prevent completion_date dan status updates
              pendingApprovalPlansRef.current.add(id);
              
              // Prevent update approved, completion_date, dan status
              // Toggle akan tetap di posisi off sampai task dipilih
              return;
            }
          }
        }
      }

      // Special handling untuk status change ke "Approved"
      // Check jika perlu show modal untuk memilih daily task
      if (field === 'status' && value === 'Approved') {
        const plan = contentPlans.find(p => p.id === id);
        if (plan) {
          const oldStatus = plan.status || null;
          const oldApproved = plan.approved || false;
          const oldCompletionDate = plan.completion_date || null;
          // Request approval (akan return true jika modal dibuka)
          const shouldPreventUpdate = requestApproval(plan, oldStatus, oldApproved, oldCompletionDate);
          if (shouldPreventUpdate) {
            // Mark plan sebagai pending approval untuk prevent other updates
            pendingApprovalPlansRef.current.add(id);
            
            // Prevent normal update, tunggu task dipilih
            return;
          }
        }
      }

      // Special handling untuk status change dari "Approved" ke "Need Review" (un-approval)
      // Delete task_steps ketika status berubah dari "Approved" ke "Need Review"
      // NON-BLOCKING: jangan di-await supaya perubahan status di UI tetap cepat
      if (field === 'status' && value === 'Need Review') {
        const plan = contentPlans.find(p => p.id === id);
        if (plan && plan.status === 'Approved') {
          // Status berubah dari "Approved" ke "Need Review" - hapus task_steps di background
          handleUnapproval(id).catch((error) => {
            console.error('Error during unapproval task step deletion (status):', error);
          });
        }
      }

      // Special handling untuk approved toggle yang diubah ke false (un-approval)
      // Delete Concept task_steps ketika approved diubah dari true ke false
      // NON-BLOCKING: jangan di-await supaya toggle langsung pindah ke posisi off tanpa delay
      if (field === 'approved' && value === false) {
        const plan = contentPlans.find(p => p.id === id);
        if (plan && plan.approved === true) {
          // Approved diubah dari true ke false - hapus Concept task_steps di background
          // Only Concept steps will be deleted (Content steps remain)
          handleUnapproval(id).catch((error) => {
            console.error('Error during unapproval Concept task step deletion:', error);
          });
        }
      }

      // OPTIMIZED: Batch production_approved related fields to reduce database roundtrips
      // This prevents multiple trigger executions and improves performance
      if (field === 'production_approved' || field === 'production_approved_date' || field === 'production_status' || field === 'production_completion_date') {
        // Clear existing timeout for this plan
        const existing = pendingBatchUpdatesRef.current.get(id);
        if (existing) {
          clearTimeout(existing.timeout);
        }

        // Get or create pending updates
        const pending = pendingBatchUpdatesRef.current.get(id) || { updates: {}, timeout: null as any };
        pending.updates[field] = value;
        
        // IMPORTANT: If production_status is being set to "Request Revision", 
        // automatically include production_completion_date = null in the batch
        if (field === 'production_status' && value === 'Request Revision') {
          pending.updates['production_completion_date'] = null;
          pending.updates['production_approved'] = false;
          pending.updates['production_approved_date'] = null;
        }

        // Very short debounce (30ms) for immediate feel while still batching rapid changes
        // This ensures toggle feels instant but still batches multiple field updates
        const timeout = setTimeout(() => {
          const batch = pendingBatchUpdatesRef.current.get(id);
          if (batch && Object.keys(batch.updates).length > 0) {
            updateContentPlan(id, batch.updates);
            pendingBatchUpdatesRef.current.delete(id);
          }
        }, 30);

        pending.timeout = timeout;
        pendingBatchUpdatesRef.current.set(id, pending);
        return;
      }

      // Auto-assign PIC Production when Google Drive link is added
      if (field === 'google_drive_link' && value && value.length > 0) {
        // Check if pic_production_id already exists from task_steps_assigned
        const plan = contentPlans.find(p => p.id === id);
        
        if (plan?.pic_production_source === 'task_steps_assigned') {
          // Prioritas: task_steps_assigned > Google Drive Link
          // Jika sudah ada assignment, jangan override dengan Google Drive Link
          devLog.debug('🔗 Google Drive link added, but PIC Production already set from task_steps_assigned:', {
            planId: id,
            link: value,
            currentPicProductionId: plan.pic_production_id
          });
          
          // Update google_drive_link saja, jangan ubah pic_production_id
          updateContentPlan(id, { [field]: value });
          return;
        }
        
        // Jika belum ada assignment, baru auto-assign dari Google Drive Link
        const employeeId = currentEmployee?.id;
        
        if (!employeeId) {
          devLog.debug('⚠️ Cannot auto-assign PIC Production: Employee ID not found');
          // Still update google_drive_link, but don't set pic_production_id
          updateContentPlan(id, { [field]: value });
          toast.warning('Google Drive link saved, but could not auto-assign PIC Production (employee not found)');
          return;
        }
        
        devLog.debug('🔗 Google Drive link added, auto-assigning PIC Production:', {
          planId: id,
          link: value,
          employeeId: employeeId
        });
        
        // Update google_drive_link, pic_production_id, and pic_production_source
        updateContentPlan(id, { 
          [field]: value,
          pic_production_id: employeeId,
          pic_production_source: 'google_drive_link'
        });
      } else if (field === 'google_drive_link' && (!value || value.trim().length === 0)) {
        // When Google Drive Link is cleared
        const plan = contentPlans.find(p => p.id === id);
        
        if (plan?.pic_production_source === 'google_drive_link') {
          // If pic_production_id was from Google Drive Link, sync based on assignment
          devLog.debug('🔗 Google Drive link cleared, syncing pic_production_id:', {
            planId: id
          });
          
          // Sync pic_production_id based on assignment (if any)
          try {
            await syncPicProduction(id, null, plan.pic_production_id, plan.pic_production_source);
          } catch (error) {
            console.error('Error syncing pic_production_id:', error);
            // Continue with update even if sync fails
          }
          
          // Update google_drive_link, production_completion_date, and production_status
          updateContentPlan(id, { 
            [field]: null,
            production_completion_date: null,
            production_status: null
          });
        } else {
          // If pic_production_id was from assignment, keep it
          devLog.debug('🔗 Google Drive link cleared, but PIC Production from assignment remains:', {
            planId: id,
            currentSource: plan?.pic_production_source
          });
          
          updateContentPlan(id, { 
            [field]: null,
            production_completion_date: null,
            production_status: null
          });
        }
      } else {
        // Regular field update
        updateContentPlan(id, { [field]: value });
      }
    } catch (error) {
      console.error('Error in handleFieldChange:', error);
      toast.error('Error updating field');
    }
  }, [updateContentPlan, currentEmployee?.id, contentPlans, syncPicProduction, requestApproval]);

  const handleAddContent = useCallback(async () => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }
    if (!profile?.id) {
      toast.error("Current employee not found");
      return;
    }
    
    // Validate that the current user exists in employees table
    let validEmployeeId = profile.id;
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, user_id')
        .eq('user_id', profile.user_id)
        .eq('organization_id', organizationId)
        .single();
      
      if (employeeError || !employeeData) {
        console.error('Employee validation error:', employeeError);
        toast.error("Current employee not found in organization");
        return;
      }
      
      // Use the employee ID from the employees table, not the profile ID
      validEmployeeId = (employeeData as any)?.id || profile.id;
      console.log('✅ Valid employee found:', { profileId: profile.id, employeeId: validEmployeeId, userId: profile.user_id });
    } catch (validationError) {
      console.error('Error validating employee:', validationError);
      toast.error("Error validating employee data");
      return;
    }
    
    try {
      const newContentData = {
        organization_id: organizationId,
        post_date: new Date().toISOString().split('T')[0],
        content_type_id: null,
        pic_id: validEmployeeId,
        service_id: null,
        sub_service_id: null,
        title: null,
        content_pillar_id: null,
        brief: null,
        status: "",
        revision_count: 0,
        approved: false,
        completion_date: null,
        pic_production_id: null,
        google_drive_link: null,
        production_status: "",
        production_revision_count: 0,
        production_completion_date: null,
        production_approved: false,
        production_approved_date: null,
        post_link: null,
        done: false,
        actual_post_date: null,
        on_time_status: "",
        status_content: ""
      };
      await addContentPlan(newContentData);
      toast.success("Content added successfully");
    } catch (error) {
      console.error("Error adding new row:", error);
      toast.error("Error menambahkan baris baru: " + (error as Error).message);
    }
  }, [organizationId, profile?.id, addContentPlan]);

  const handleMasterDataChange = useCallback(async () => {
    try {
      await refreshMasterData();
    } catch (error) {
      console.error('Error refreshing master data:', error);
      toast.error('Error refreshing data');
    }
  }, [refreshMasterData]);

  const handleEditTarget = useCallback((manager: any) => {
    setEditingManager(manager);
    if (activePerformanceTab === 'content-planner') {
      setTargetType('content_planning');
    } else if (activePerformanceTab === 'production') {
      setTargetType('content_production');
    } else if (activePerformanceTab === 'content-post') {
      setTargetType('content_posting');
    }
    setIsEditTargetOpen(true);
  }, [activePerformanceTab]);

  const handlePreviousMonth = useCallback(() => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  }, [selectedMonth]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  }, [selectedMonth]);

  // Brief Dialog Handlers
  const openBriefDialog = useCallback((id: string, brief: string | null) => {
    setBriefDialog({
      isOpen: true,
      id,
      brief
    });
  }, []);

  const closeBriefDialog = useCallback(() => {
    setBriefDialog({
      isOpen: false,
      id: "",
      brief: null
    });
  }, []);

  const saveBrief = useCallback((brief: string, shouldUpdateStatus: boolean = false) => {
    if (briefDialog.id) {
      handleFieldChange(briefDialog.id, 'brief', brief);
      if (shouldUpdateStatus) {
        handleFieldChange(briefDialog.id, 'status', 'Need Review');
      }
    }
  }, [briefDialog.id, handleFieldChange]);

  // Title Dialog Handlers
  const openTitleDialog = useCallback((id: string, title: string | null, approved?: boolean) => {
    setTitleDialog({
      isOpen: true,
      id,
      title,
      approved
    });
  }, []);

  const closeTitleDialog = useCallback(() => {
    setTitleDialog({
      isOpen: false,
      id: "",
      title: null,
      approved: undefined
    });
  }, []);

  const saveTitle = useCallback((title: string) => {
    if (titleDialog.id) {
      handleFieldChange(titleDialog.id, 'title', title);
    }
  }, [titleDialog.id, handleFieldChange]);

  return (
    <StandardLayout>
      <SocialMediaErrorBoundary>
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
          <div className="flex flex-1 min-h-0">
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
              <div className="h-full flex flex-col overflow-hidden">
                  {/* Header and Tabs */}
                  <div className="flex-shrink-0 mb-1">
                    <HeaderAndTab 
                      activeMainTab={activeMainTab} 
                      handleTabChange={handleTabChange} 
                    />
                  </div>

                  <Tabs value={activeMainTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                    <TabsContent value="dashboard" className="mt-0 flex-1 flex flex-col min-h-0 h-full">
                      {/* Performance Tables - Full Width Above Sidebar */}
                      <div className="flex-shrink-0 mb-2">
                        <SocialMediaErrorBoundary>
                          <SocialMediaPerformanceTabs 
                            activePerformanceTab={activePerformanceTab} 
                            setActivePerformanceTab={setActivePerformanceTab} 
                            selectedDate={selectedDate} 
                            setSelectedDate={setSelectedDate} 
                            selectedMonth={selectedMonth} 
                            setSelectedMonth={setSelectedMonth} 
                            isCalendarOpen={isCalendarOpen} 
                            setIsCalendarOpen={setIsCalendarOpen} 
                            isMonthSelectorOpen={isMonthSelectorOpen} 
                            setIsMonthSelectorOpen={setIsMonthSelectorOpen} 
                            contentPlanners={contentPlanners || []} 
                            creativeProductionMembers={creativeProductionMembers || []} 
                            handleEditTarget={handleEditTarget} 
                            handlePreviousMonth={handlePreviousMonth} 
                            handleNextMonth={handleNextMonth} 
                          />
                        </SocialMediaErrorBoundary>
                      </div>

                      {/* Main Grid Layout - Metrics, Table, and Sidebar */}
                      <DashboardLoadingWrapper isLoading={loading}>
                        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
                          {/* Left Section - Main Content (75% width / 9 cols) */}
                          <div className="col-span-9 space-y-2 flex flex-col min-h-0 h-full">
                            {/* Social Media Metrics */}
                            <div className="flex-shrink-0">
                              <SocialMediaErrorBoundary>
                                <SocialMediaMetrics metrics={metrics} isLoading={false} />
                              </SocialMediaErrorBoundary>
                            </div>

                            {/* Social Media Plan Table */}
                            <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 relative h-full">
                              {/* Filters Section - Sticky at top */}
                              <div className="sticky top-0 p-4 pb-3 flex-shrink-0 border-b-2 border-gray-300 bg-white z-20">
                                <SocialMediaErrorBoundary>
                                  <SocialMediaFilters 
                                    searchTerm={searchTerm} 
                                    setSearchTerm={setSearchTerm} 
                                    statusFilter={statusFilter} 
                                    setStatusFilter={setStatusFilter} 
                                    serviceFilter={serviceFilter}
                                    setServiceFilter={setServiceFilter}
                                    services={services}
                                    selectedItems={selectedItems} 
                                    onAddContent={handleAddContent} 
                                    onDeleteSelected={handleDeleteSelected}
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                  />
                                </SocialMediaErrorBoundary>
                              </div>
                              
                              {/* Scrollable Content Area */}
                              <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                                <SocialMediaErrorBoundary>
                                  <ContentPlanTable 
                                    contentPlans={Array.isArray(filteredContentPlans) ? filteredContentPlans : []} 
                                    contentTypes={Array.isArray(contentTypes) ? contentTypes : []} 
                                    services={Array.isArray(services) ? services : []} 
                                    subServices={Array.isArray(subServices) ? subServices : []} 
                                    contentPillars={Array.isArray(contentPillars) ? contentPillars : []} 
                                    onSelectItem={handleSelectItem} 
                                    selectedItems={selectedItems} 
                                    onFieldChange={handleFieldChange} 
                                    onOpenBriefDialog={openBriefDialog} 
                                    onOpenTitleDialog={openTitleDialog} 
                                    onContentTypeDataChange={handleMasterDataChange} 
                                    onServiceDataChange={handleMasterDataChange} 
                                    onContentPillarDataChange={handleMasterDataChange} 
                                    loading={false}
                                    approvalAccess={approvalAccess}
                                    requestApproval={requestApproval}
                                    handleUnapproval={handleUnapproval}
                                  />
                                </SocialMediaErrorBoundary>
                              </div>

                              {/* Table Footer - Sticky at bottom */}
                              <div className="sticky bottom-0 left-0 right-0 flex-shrink-0 bg-white z-10 border-t border-gray-200">
                                <TableFooter 
                                  onContentTypeDataChange={handleMasterDataChange} 
                                  onServiceDataChange={handleMasterDataChange} 
                                  onContentPillarDataChange={handleMasterDataChange} 
                                  onSocialMediaNameDataChange={() => {}} 
                                  services={Array.isArray(services) ? services : []} 
                                />
                              </div>
                            </div>
                          </div>

                           {/* Right Section - Sidebar (25% width / 3 cols) */}
                           <div className="col-span-3 space-y-2 flex flex-col min-h-0 h-full">
                             <div className="h-full flex flex-col">
                               <SidebarContainer selectedMonth={selectedMonth} serviceFilter={serviceFilter} />
                             </div>
                           </div>
                        </div>
                      </DashboardLoadingWrapper>
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <BriefDialog 
            isOpen={briefDialog.isOpen} 
            onClose={closeBriefDialog} 
            brief={briefDialog.brief || ""} 
            onSave={saveBrief}
            socialMediaPlanId={briefDialog.id}
          />

          <TitleDialog 
            isOpen={titleDialog.isOpen} 
            onClose={closeTitleDialog} 
            title={titleDialog.title || ""} 
            onSave={saveTitle}
            socialMediaPlanId={titleDialog.id}
            approved={titleDialog.id ? contentPlans.find(p => p.id === titleDialog.id)?.approved : undefined}
          />

          <EditTargetDialog 
            isOpen={isEditTargetOpen} 
            onClose={() => setIsEditTargetOpen(false)}
            employeeId={editingManager?.id}
            employeeName={editingManager?.name}
            targetType={targetType}
          />

          {/* Daily Task Selector Dialog for Approval */}
          {pendingApproval && (
            <DailyTaskSelectorDialog
              isOpen={isTaskSelectorOpen}
              onClose={handleModalClose}
              onSelect={handleTaskSelected}
              dueDate={pendingApproval.plan.post_date || null}
              serviceName={pendingApproval.plan.service?.name || (services?.find?.((s: any) => s.id === pendingApproval.plan.service_id)?.name) || ''}
              organizationIdOverride={pendingApproval.plan.organization_id}
              skipAssignment={true} // Skip assignment modal karena task step auto-completed
            />
          )}
              </div>
            </div>
          </div>
        </div>
      </SocialMediaErrorBoundary>
    </StandardLayout>
  );
}

// Main export with providers
export default function SocialMediaDashboardPage() {
  return (
    <OptimizedErrorBoundary>
      <RealtimeSocialMediaProvider>
        <PICFilterProvider>
          <SocialMediaContent />
        </PICFilterProvider>
      </RealtimeSocialMediaProvider>
    </OptimizedErrorBoundary>
  );
}
