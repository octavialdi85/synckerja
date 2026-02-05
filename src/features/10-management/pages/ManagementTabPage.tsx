import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { LoadingDots } from '@/components/LoadingDots';
import { HeaderAndTab } from '@/features/10-management/components/sections/HeaderAndTab';
import { CreditCard } from 'lucide-react';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useOptimizedSubscription } from '../hooks/useOptimizedSubscription';
import { CurrentPlanSection, QuickActionsPanel, PaymentHistory } from '../components/sections';

const ManagementContent = memo(() => {
  const { subscriptionStatus, refreshSubscriptionStatus } = useOptimizedSubscription();

  return (
    <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
      {/* Main Content Section - 9 columns */}
      <div className="col-span-9 flex flex-col min-h-0 h-full">
        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          {/* Content Header */}
          <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-gray-900">Subscription Management</h2>
                  <p className="text-xs text-gray-500">Manage your subscription and billing details</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
            <div className="p-4 space-y-4">
              {/* Enhanced Subscription Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Current Plan Section */}
                <CurrentPlanSection subscriptionStatus={subscriptionStatus} />

                {/* Action Panel */}
                <QuickActionsPanel 
                  subscriptionStatus={subscriptionStatus}
                  onRefreshStatus={refreshSubscriptionStatus}
                />
              </div>

              {/* Payment History */}
              <PaymentHistory />
            </div>
          </div>

          {/* Content Footer */}
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last Updated: {new Date().toLocaleTimeString()}</span>
              <button 
                onClick={refreshSubscriptionStatus}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Section - 3 columns */}
      <div className="col-span-3 h-full">
        <div className="bg-white border rounded-lg h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 py-1.5 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Quick Info</h3>
            <p className="text-xs text-gray-500 mt-1">Subscription details</p>
          </div>

          {/* Scrollable Sidebar Content */}
          <div className="flex-1 overflow-y-auto seamless-scroll p-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Current Plan</p>
                <p className="text-sm font-semibold text-gray-900">{subscriptionStatus?.plan_name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-sm font-semibold text-gray-900">{subscriptionStatus?.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div className="p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Member Count</p>
                <p className="text-sm font-semibold text-gray-900">{subscriptionStatus?.current_employees || 0} / {subscriptionStatus?.member_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">Subscription Management</div>
          </div>
        </div>
      </div>
    </div>
  );
});

ManagementContent.displayName = 'ManagementContent';

const loadingFallback = (
  <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
    <div className="col-span-9">
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <LoadingDots size="lg" />
      </div>
    </div>
    <div className="col-span-3">
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <LoadingDots size="lg" />
      </div>
    </div>
  </div>
);

const ManagementTabPage = memo(() => {
  useOptimizedPerformanceMonitor('ManagementTabPage');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('management');
  const { loading: orgLoading, organizationId } = useCurrentOrg();
  const { statusLoading, subscriptionStatus, statusError } = useOptimizedSubscription();

  // Single loading gate: wait for org, then subscription data or error (avoids race where statusLoading is false for one frame after org appears)
  const hasSubscriptionResult = subscriptionStatus != null || statusError != null;
  const pageLoading =
    orgLoading ||
    !organizationId ||
    statusLoading ||
    (!!organizationId && !statusLoading && !hasSubscriptionResult);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    
    // Navigate to the appropriate route
    switch (tab) {
      case 'overview':
        navigate('/subscription/overview');
        break;
      case 'plans':
        navigate('/subscription/plans');
        break;
      case 'management':
        navigate('/subscription/management');
        break;
      default:
        navigate('/subscription/management');
    }
  }, [navigate]);
  
  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
            <div className="h-full flex flex-col overflow-hidden">
                {/* Header and Tab Navigation */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                  />
                </div>

                {/* Management Content - single loading state to avoid flicker */}
                <div className="flex-1 min-h-0">
                  {pageLoading ? loadingFallback : <ManagementContent />}
                </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
});

ManagementTabPage.displayName = 'ManagementTabPage';

export default ManagementTabPage;
