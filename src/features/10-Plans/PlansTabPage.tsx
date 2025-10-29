import { memo, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedPerformanceMonitor } from '@/features/10-management/hooks/useOptimizedPerformanceMonitor';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { Skeleton } from '@/features/ui/skeleton';
import { HeaderAndTab } from '../10-overview/section/HeaderAndTab';
import HRISSubscriptionPlansTab from './HRISSubscriptionPlansTab';

const PlansTabPage = memo(() => {
  useOptimizedPerformanceMonitor('PlansTabPage');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plans');

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
        navigate('/subscription/plans');
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

                {/* Plans Content */}
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
                    <HRISSubscriptionPlansTab />
                  </Suspense>
                </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
});

PlansTabPage.displayName = 'PlansTabPage';

export default PlansTabPage;
