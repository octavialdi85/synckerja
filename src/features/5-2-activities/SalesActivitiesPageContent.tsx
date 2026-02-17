import React, { useState } from 'react';
import { SalesActivitiesFilters } from './SalesActivitiesFilters';
import { SalesActivitiesMetricsCards } from './SalesActivitiesMetricsCards';
import { SalesActivitiesTable } from './SalesActivitiesTable';
import { SalesActivitiesOverview } from './SalesActivitiesOverview';
import { SalesActivitiesSidebarFooter } from './SalesActivitiesSidebarFooter';
import { SalesActivityDialog } from './SalesActivityDialog';
import { PaymentUpdateModal } from '@/features/5-2-jadwal-kunjungan/PaymentUpdateModal';
import { CreateTaskDialog, type TaskFormData } from '@/features/8-2-DailyTask/section/CreateTaskDialog';
import { SopSelectionPopup } from './components/SopSelectionPopup';
import { useSalesActivities, type SalesActivity } from '@/hooks/organized/sales';
import { useDailyTask } from '@/features/8-2-DailyTask/DailyTaskContext';
import { Button } from '@/features/ui/button';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { Plus } from 'lucide-react';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { devLog } from '@/config/logger';

// Persist across remounts so we don't show spinner again after first successful load (avoids flicker on refetch/Strict Mode)
let salesActivitiesLastData: SalesActivity[] = [];
let salesActivitiesHasLoadedOnce = false;

export const SalesActivitiesPageContent = () => {
  const { activities, loading, refetch, error, isError, deleteSalesActivity } = useSalesActivities();
  if (!loading) {
    salesActivitiesHasLoadedOnce = true;
    salesActivitiesLastData = activities;
  }
  const effectiveActivities = loading && salesActivitiesHasLoadedOnce ? salesActivitiesLastData : activities;
  const showLoadingSpinner = loading && !salesActivitiesHasLoadedOnce;
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SalesActivity | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedActivityForPayment, setSelectedActivityForPayment] = useState<SalesActivity | null>(null);
  const [paymentModalViewOnly, setPaymentModalViewOnly] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [createTaskPrefill, setCreateTaskPrefill] = useState<{
    title: string;
    description: string;
    service_id: string;
    sub_service_id: string | null;
  } | null>(null);
  const [createTaskFromPayment, setCreateTaskFromPayment] = useState(false);
  const [sopPopupOpen, setSopPopupOpen] = useState(false);
  const [pendingTaskFormData, setPendingTaskFormData] = useState<TaskFormData | null>(null);
  const { refetchTasks } = useDailyTask();
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    payment: 'all',
    date: 'all'
  });

  const handleEdit = (activity: SalesActivity) => {
    setEditingActivity(activity);
    setShowDialog(true);
  };

  const handleDialogSuccess = () => {
    // Force immediate refresh
    refetch();
    
    // Close dialog and clear editing activity
    setShowDialog(false);
    setEditingActivity(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setEditingActivity(null);
    }
  };

  const handleAddActivity = () => {
    setEditingActivity(null);
    setShowDialog(true);
  };

  const handleUpdatePayment = (activity: SalesActivity) => {
    setSelectedActivityForPayment(activity);
    setPaymentModalViewOnly(false);
    setShowPaymentModal(true);
  };

  const handleCheckHistory = (activity: SalesActivity) => {
    setSelectedActivityForPayment(activity);
    setPaymentModalViewOnly(true);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedActivityForPayment(null);
    setPaymentModalViewOnly(false);
  };

  const handleFirstPaymentSuccess = (payload: {
    title: string;
    description: string;
    service_id: string;
    sub_service_id: string | null;
  }) => {
    setCreateTaskPrefill(payload);
    setCreateTaskFromPayment(true);
    setShowCreateTaskDialog(true);
  };

  const handleSubmitWithSop = (formData: TaskFormData) => {
    setPendingTaskFormData(formData);
    setSopPopupOpen(true);
  };

  const handleSopSuccess = () => {
    setShowCreateTaskDialog(false);
    setCreateTaskPrefill(null);
    setCreateTaskFromPayment(false);
    setPendingTaskFormData(null);
    setSopPopupOpen(false);
    refetchTasks?.();
  };

  const handleSopCancel = () => {
    setSopPopupOpen(false);
    setPendingTaskFormData(null);
  };

  const handleCreateTaskDialogOpenChange = (open: boolean) => {
    if (!open) {
      setShowCreateTaskDialog(false);
      setCreateTaskPrefill(null);
      setCreateTaskFromPayment(false);
    }
  };

  const handleDelete = async (activity: SalesActivity) => {
    if (!confirm(`Are you sure you want to delete this sales activity for "${activity.client_name}"?`)) {
      return;
    }

    try {
      await deleteSalesActivity(activity.id);
      toast({
        title: "Success",
        description: "Sales activity deleted successfully",
      });
    } catch (error: any) {
      devLog.error('Error deleting sales activity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete sales activity",
        variant: "destructive",
      });
    }
  };

  const filteredActivities = effectiveActivities.filter(activity => {
    if (filters.search && !activity.client_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status !== 'all' && activity.status !== filters.status) {
      return false;
    }
    if (filters.type !== 'all' && activity.activity_type !== filters.type) {
      return false;
    }
    if (filters.payment !== 'all' && activity.payment_method !== filters.payment) {
      return false;
    }
    return true;
  });

  // Calculate unique activity types for footer
  const uniqueTypes = [...new Set(filteredActivities.map(a => a.activity_type).filter(Boolean))];

  return (
    <>
      {/* Edit Dialog */}
      <SalesActivityDialog
        open={showDialog}
        onOpenChange={handleCloseDialog}
        onSuccess={handleDialogSuccess}
        activity={editingActivity}
      />

      {/* Payment Update Modal */}
      <PaymentUpdateModal
        open={showPaymentModal}
        onClose={handleClosePaymentModal}
        salesActivityId={selectedActivityForPayment?.id || ''}
        clientName={selectedActivityForPayment?.client_name || ''}
        viewOnly={paymentModalViewOnly}
        onFirstPaymentSuccess={handleFirstPaymentSuccess}
      />

      {/* Create New Task (from first payment) - same component as /tools/daily-task */}
      <CreateTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={handleCreateTaskDialogOpenChange}
        defaultTitle={createTaskPrefill?.title ?? ''}
        defaultDescription={createTaskPrefill?.description ?? ''}
        dismissible={!createTaskFromPayment}
        onSubmitWithSop={createTaskFromPayment ? handleSubmitWithSop : undefined}
      />

      <SopSelectionPopup
        open={sopPopupOpen}
        onClose={() => setSopPopupOpen(false)}
        formData={pendingTaskFormData}
        serviceId={createTaskPrefill?.service_id ?? null}
        subServiceId={createTaskPrefill?.sub_service_id ?? null}
        onSuccess={handleSopSuccess}
        onCancel={handleSopCancel}
      />

      {/* Grid Layout: 12 columns (9-3) */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
        {/* Main Content - 9 columns */}
        <div className="col-span-9 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0">
            {/* Filter Section */}
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <SalesActivitiesFilters 
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            </div>
            
            {/* Metrics Cards Section */}
            <div className="flex-shrink-0 mb-2">
              <SalesActivitiesMetricsCards activities={filteredActivities} />
            </div>

            {isError && (
              <div className="flex-shrink-0 mb-2">
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      {error instanceof Error ? error.message : 'Failed to load sales activities.'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Table Section - Main Content */}
            <div className="flex-1 min-h-0 h-full">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                <SalesActivitiesTable 
                  activities={filteredActivities}
                  loading={showLoadingSpinner}
                  onUpdate={refetch}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdatePayment={handleUpdatePayment}
                  onCheckHistory={handleCheckHistory}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Overview Sidebar (25% like employee page) */}
        <div className="col-span-3 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-0">
              {/* Sidebar Header */}
              <div className="px-4 py-1.5 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">Sales Activities Overview</h3>
                    <p className="text-xs text-gray-500 mt-1">Summary of sales activities</p>
                  </div>
                  <Button
                    onClick={handleAddActivity}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Activity
                  </Button>
                </div>
              </div>

              {/* Scrollable Sidebar Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full p-4 seamless-scroll max-h-[calc(100vh-120px)]">
                  <SalesActivitiesOverview activities={filteredActivities} />
                </div>
              </div>

              {/* Sidebar Footer */}
              <SalesActivitiesSidebarFooter 
                totalTypes={uniqueTypes.length}
                totalActivities={filteredActivities.length}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
