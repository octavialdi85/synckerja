import { memo, Suspense, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { Skeleton } from '@/features/ui/skeleton';
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

const OverviewTabContent = memo(({ subscriptionStatus, analytics, analyticsLoading }: any) => {
  const [lastUpdated] = useState(new Date());

  return (
    <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
      {/* Main Content Section - 9 columns */}
      <div className="col-span-9 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-180px)]">
            {/* Content Header */}
            <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-gray-900">Company Overview</h2>
                  <p className="text-xs text-gray-500 mt-1">Monitor your subscription and usage metrics</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
              <div className="p-4 space-y-4">
                {/* Current Subscription Overview */}
                {subscriptionStatus && (
                  <CurrentSubscription subscriptionStatus={subscriptionStatus} />
                )}

                {/* Quick Stats Metric Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Subscription Metrics</h3>
                    <div className="flex items-center gap-2">
                      {subscriptionStatus && (
                        <span className="text-sm text-gray-500">
                          Plan: {subscriptionStatus.plan_name}
                        </span>
                      )}
                      <button 
                        onClick={() => refreshSubscriptionStatus()}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
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
      </div>
      
      {/* Sidebar Section - 3 columns */}
      <div className="col-span-3 h-full">
        <div className="bg-white border rounded-lg h-full flex flex-col max-h-[calc(100vh-180px)]">
          {/* Sidebar Header */}
          <div className="px-4 py-2 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Quick Summary</h3>
            <p className="text-xs text-gray-500 mt-1">Recent activity and stats</p>
          </div>

          {/* Scrollable Sidebar Content */}
          <div className="flex-1 overflow-y-auto seamless-scroll p-4">
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
      console.log('⏰ Starting emergency refresh timer (10s)');
      emergencyTimer = setTimeout(() => {
        console.log('🚨 EMERGENCY REFRESH: Data not loaded after 10s, forcing refresh');
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

  // Optimized debug logging - only in development and only on changes
  useEffect(() => {
    if (import.meta.env.DEV && subscriptionStatus) {
      console.log('🎯 Subscription Data:', {
        plan: subscriptionStatus.plan_name,
        members: `${subscriptionStatus.current_employees}/${subscriptionStatus.member_count}`,
        active: subscriptionStatus.is_active
      });
    }
  }, [subscriptionStatus?.plan_name, subscriptionStatus?.is_active]);



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
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <main className="flex-1 px-4 pt-16 pb-4 min-h-0">
              <div className="h-full flex flex-col overflow-hidden">
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
                        <Skeleton className="h-full w-full" />
                      </div>
                      <div className="col-span-3">
                        <Skeleton className="h-full w-full" />
                      </div>
                    </div>
                  }>
                    {/* Optimized Loading Logic */}
                    {(isLoading || orgLoading) && !subscriptionStatus ? (
                      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                        <div className="col-span-9">
                          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                            <p className="text-sm text-gray-500 mt-4">Loading subscription data...</p>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <Skeleton className="h-full w-full" />
                        </div>
                      </div>
                    ) : (
                      <OverviewTabContent 
                        subscriptionStatus={subscriptionStatus}
                        analytics={analytics}
                        analyticsLoading={analyticsLoading}
                      />
                    )}
                  </Suspense>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
});

OverviewTabPage.displayName = 'OverviewTabPage';

export default OverviewTabPage;
