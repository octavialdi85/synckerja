import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from "@/features/ui/tabs";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
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
// import { useCurrentEmployee } from "@/features/1-login/hooks/useUserData"; // Commented out - not available

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
  const { data: digitalEmployees = [] } = useDigitalMarketingEmployees();
  const { data: creativeEmployees = [] } = useCreativeEmployees();
  // const { data: profile } = useCurrentEmployee(); // Commented out - hook not available

  // State hooks
  const [activeMainTab, setActiveMainTab] = useState("dashboard");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activePerformanceTab, setActivePerformanceTab] = useState("content-planner");

  // Date states for performance tabs
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
  }>({
    isOpen: false,
    id: "",
    title: null
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

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  // Filtered content plans
  const filteredContentPlans = useOptimizedFiltering(
    loading ? [] : contentPlans, 
    searchTerm, 
    statusFilter
  );

  // Calculate metrics from contentPlans
  const metrics = React.useMemo(() => {
    if (!contentPlans.length) {
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
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // Filter plans by day
    const dailyContentPlans = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getDate() === currentDay && 
             postDate.getMonth() === currentMonth && 
             postDate.getFullYear() === currentYear;
    });

    // Filter plans by month
    const monthlyContentPlans = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate.getMonth() === currentMonth && 
             postDate.getFullYear() === currentYear;
    });

    // Helper functions
    const isOverdue = (plan: any) => {
      if (!plan.post_date) return false;
      const postDate = new Date(plan.post_date);
      return postDate <= today && !plan.approved && !plan.done;
    };

    const isCompleted = (plan: any) => plan.approved || plan.done;
    const needsRevision = (plan: any) => plan.status === 'Request Revisi' || plan.production_status === 'Request Revisi';

    return {
      dailyOverdueContent: dailyContentPlans.filter(isOverdue).length,
      dailyCompletedContent: dailyContentPlans.filter(isCompleted).length,
      dailyRevisedContent: dailyContentPlans.filter(needsRevision).length,
      dailyTotalContent: dailyContentPlans.length,
      monthlyOverdueContent: monthlyContentPlans.filter(isOverdue).length,
      monthlyCompletedContent: monthlyContentPlans.filter(isCompleted).length,
      monthlyRevisedContent: monthlyContentPlans.filter(needsRevision).length,
      monthlyTotalContent: monthlyContentPlans.length
    };
  }, [contentPlans]);

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

  const handleFieldChange = useCallback((id: string, field: string, value: any) => {
    try {
      // Auto-assign PIC Production when Google Drive link is added
      if (field === 'google_drive_link' && value && value.length > 0 && profile?.id) {
        console.log('🔗 Google Drive link added, auto-assigning PIC Production:', {
          planId: id,
          link: value,
          profileId: profile.id
        });
        
        // Update both google_drive_link and pic_production_id
        updateContentPlan(id, { 
          [field]: value,
          pic_production_id: profile.id
        });
      } else if (field === 'google_drive_link' && (!value || value.length === 0)) {
        console.log('🔗 Google Drive link cleared, clearing PIC Production:', {
          planId: id,
          link: value
        });
        
        // Clear both google_drive_link and pic_production_id
        updateContentPlan(id, { 
          [field]: value,
          pic_production_id: null
        });
      } else {
        // Regular field update
        updateContentPlan(id, { [field]: value });
      }
    } catch (error) {
      console.error('Error in handleFieldChange:', error);
      toast.error('Error updating field');
    }
  }, [updateContentPlan, profile?.id]);

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
  const openTitleDialog = useCallback((id: string, title: string | null) => {
    setTitleDialog({
      isOpen: true,
      id,
      title
    });
  }, []);

  const closeTitleDialog = useCallback(() => {
    setTitleDialog({
      isOpen: false,
      id: "",
      title: null
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
                      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
                {/* Left Section - Main Content (75% width / 9 cols) */}
                <div className="col-span-9 space-y-2 flex flex-col seamless-scroll h-full">
                  {/* Social Media Metrics */}
                  <div className="flex-shrink-0">
                    <SocialMediaErrorBoundary>
                      <SocialMediaMetrics metrics={metrics} />
                    </SocialMediaErrorBoundary>
                  </div>

                  {/* Social Media Plan Table */}
                  <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 relative seamless-scroll h-full">
                    {/* Filters Section - Sticky at top */}
                    <div className="sticky top-0 p-4 pb-3 flex-shrink-0 border-b-2 border-gray-300 bg-white z-30">
                      <SocialMediaErrorBoundary>
                        <SocialMediaFilters 
                          searchTerm={searchTerm} 
                          setSearchTerm={setSearchTerm} 
                          statusFilter={statusFilter} 
                          setStatusFilter={setStatusFilter} 
                          selectedItems={selectedItems} 
                          onAddContent={handleAddContent} 
                          onDeleteSelected={handleDeleteSelected} 
                        />
                      </SocialMediaErrorBoundary>
                    </div>
                    
                    {/* Scrollable Content Area */}
                    <div className="flex-1 min-h-0 overflow-auto seamless-scroll">
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
                          loading={loading} 
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
                 <div className="col-span-3 space-y-2 seamless-scroll h-full">
                   <div className="h-full flex flex-col">
                     <SidebarContainer />
                   </div>
                 </div>
              </div>
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
          />

          <EditTargetDialog 
            isOpen={isEditTargetOpen} 
            onClose={() => setIsEditTargetOpen(false)}
            employeeId={editingManager?.id}
            employeeName={editingManager?.name}
            targetType={targetType}
          />
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
