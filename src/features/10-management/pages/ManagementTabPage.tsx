import { memo, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { Skeleton } from '@/features/ui/skeleton';
import { HeaderAndTab } from '@/features/10-management/components/sections/HeaderAndTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { CreditCard } from 'lucide-react';
import { useOptimizedSubscription } from '../hooks/useOptimizedSubscription';
import { CurrentPlanSection, QuickActionsPanel, PaymentHistory } from '../components/sections';

const ManagementContent = memo(() => {
  const { subscriptionStatus, refreshSubscriptionStatus } = useOptimizedSubscription();

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Enhanced Subscription Management */}
      <div className="flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Management
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 sm:gap-2">
              {/* Current Plan Section */}
              <CurrentPlanSection subscriptionStatus={subscriptionStatus} />

              {/* Action Panel */}
              <QuickActionsPanel 
                subscriptionStatus={subscriptionStatus}
                onRefreshStatus={refreshSubscriptionStatus}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <div className="flex-shrink-0">
        <PaymentHistory />
      </div>
    </div>
  );
});

ManagementContent.displayName = 'ManagementContent';

const ManagementTabPage = memo(() => {
  useOptimizedPerformanceMonitor('ManagementTabPage');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('management');

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

                {/* Management Content */}
                <div className="flex-1 min-h-0 overflow-auto p-2">
                  <Suspense fallback={
                    <div className="space-y-4">
                      <Skeleton className="h-32 w-full" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-32 w-full" />
                        ))}
                      </div>
                    </div>
                  }>
                    <ManagementContent />
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

ManagementTabPage.displayName = 'ManagementTabPage';

export default ManagementTabPage;
