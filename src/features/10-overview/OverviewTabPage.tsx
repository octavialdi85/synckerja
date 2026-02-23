import { memo, Suspense, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { Skeleton } from '@/features/ui/skeleton';
import { LoadingDots } from '@/components/LoadingDots';
import { useOptimizedSubscription } from '@/features/10-management/hooks/useOptimizedSubscription';
import { useSubscriptionAnalytics } from '@/features/10-overview/hooks/useSubscriptionAnalytics';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import {
  HeaderAndTab,
  CurrentSubscription,
  MetricCards,
  EmployeeGrowthChart,
  FeatureUsageChart,
  UsageMetricsCards,
  OverviewSidebar,
  OverviewFooter,
  OverviewSidebarFooter
} from './section';

const OverviewTabContent = memo(({ subscriptionStatus, analytics, analyticsLoading, refreshSubscriptionStatus }: any) => {
  const [lastUpdated] = useState(new Date());

  return (
    <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
      {/* Main Content Section - 9 columns */}
      <div className="col-span-9 flex flex-col min-h-0 h-full">
        <div className="h-full min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            {/* Content Header */}
            <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-gray-900">Company Overview</h2>
                  <p className="text-xs text-gray-500 mt-1">Monitor your subscription and usage metrics</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content - single scroll per panel (rule 3.1) */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
              <div className="p-4 space-y-4">
                {/* Current Subscription Overview */}
                {subscriptionStatus && (
                  <CurrentSubscription subscriptionStatus={subscriptionStatus} />
                )}

                {/* Quick Stats Metric Cards */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 shrink-0">Subscription Metrics</h3>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {subscriptionStatus && (
                        <span className="text-sm text-gray-500 truncate" title={subscriptionStatus.plan_name}>
                          Plan: {subscriptionStatus.plan_name}
                        </span>
                      )}
                      <button 
                        onClick={() => refreshSubscriptionStatus()}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors shrink-0"
                        title="Refresh subscription data"
                      >
                        Refresh Data
                      </button>
                    </div>
                  </div>
                  <MetricCards subscriptionStatus={subscriptionStatus} />
                </div>

                {/* Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <EmployeeGrowthChart 
                    data={analytics?.employee_growth || []} 
                    isLoading={analyticsLoading} 
                  />
                  <FeatureUsageChart 
                    data={analytics?.feature_usage || []} 
                    isLoading={analyticsLoading} 
                  />
                </div>

                {/* Usage Metrics Cards */}
                <UsageMetricsCards 
                  metrics={analytics?.usage_metrics || null} 
                  isLoading={analyticsLoading} 
                />
              </div>
            </div>

            {/* Content Footer */}
            <OverviewFooter 
              totalMetrics={4}
              lastUpdated={lastUpdated}
              onRefresh={() => window.location.reload()}
              isRefreshing={false}
            />
        </div>
      </div>
      
      {/* Sidebar Section - 3 columns */}
      <div className="col-span-3 h-full min-h-0">
        <div className="bg-white border rounded-lg h-full flex flex-col min-h-0">
          {/* Sidebar Header */}
          <div className="px-4 py-1.5 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Quick Summary</h3>
            <p className="text-xs text-gray-500 mt-1">Recent activity and stats</p>
          </div>

          {/* Scrollable Sidebar Content - single scroll per panel (rule 3.1) */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain p-4">
            <OverviewSidebar subscriptionStatus={subscriptionStatus} />
          </div>

          {/* Sidebar Footer */}
          <OverviewSidebarFooter 
            activeEmployees={subscriptionStatus?.employee_count || 0}
            totalFeatures={analytics?.feature_usage?.length || 0}
          />
        </div>
      </div>
    </div>
  );
});

OverviewTabContent.displayName = 'OverviewTabContent';

const OverviewTabPage = memo(() => {
  useOptimizedPerformanceMonitor('OverviewTabPage');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [forceRefresh, setForceRefresh] = useState(0);

  const { organizationId, loading: orgLoading } = useCurrentOrg();
  
  const {
    subscriptionStatus,
    isLoading,
    statusError,
    refreshSubscriptionStatus
  } = useOptimizedSubscription();
  
  const {
    analytics,
    isLoading: analyticsLoading
  } = useSubscriptionAnalytics();

  // EMERGENCY REFRESH MECHANISM - If data doesn't load within 10 seconds
  useEffect(() => {
    let emergencyTimer: NodeJS.Timeout;
    
    if (organizationId && isLoading && !subscriptionStatus && !statusError) {
      emergencyTimer = setTimeout(() => {
        refreshSubscriptionStatus();
        setForceRefresh(prev => prev + 1);
      }, 10000);
    }
    
    return () => {
      if (emergencyTimer) {
        clearTimeout(emergencyTimer);
      }
    };
  }, [organizationId, isLoading, subscriptionStatus, statusError, refreshSubscriptionStatus]);

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
        navigate('/subscription/overview');
    }
  }, [navigate]);
  
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
            <div className="h-full flex flex-col min-h-0">
                {/* Header and Tab Navigation */}
                <div className="flex-shrink-0 mb-1">
                  <HeaderAndTab 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                  />
                </div>

                {/* Overview Content */}
                <div className="flex-1 min-h-0">
                  <Suspense fallback={
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
                  }>
                    <OverviewTabContent 
                      subscriptionStatus={subscriptionStatus}
                      analytics={analytics}
                      analyticsLoading={analyticsLoading}
                      refreshSubscriptionStatus={refreshSubscriptionStatus}
                    />
                  </Suspense>
                </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
});

OverviewTabPage.displayName = 'OverviewTabPage';

export default OverviewTabPage;
